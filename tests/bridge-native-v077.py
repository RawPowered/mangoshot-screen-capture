"""Run the real native host and MCP adapter over local pipes and authenticated TCP."""
import importlib.util
import json
import os
import pathlib
import secrets
import socket
import subprocess
import sys
import threading

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = ROOT / "companion" / "mangoshot_bridge.py"
spec = importlib.util.spec_from_file_location("mangoshot_bridge", SOURCE)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
command = [str(pathlib.Path(sys.argv[1]).resolve())] if len(sys.argv) > 1 else [sys.executable, str(SOURCE)]
host = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
client = None
try:
    mod.send(host.stdin, {"type": "start", "scopes": ["inspect", "propose", "frame"]})
    ready = mod.receive(host.stdout)
    assert ready["type"] == "ready" and ready["expiresIn"] == 1800
    assert len(ready["token"]) == 64
    assert ready["version"] == "0.7.7.2"
    def local(token, ident, method, args):
        with socket.create_connection(("127.0.0.1", ready["port"]), timeout=3) as conn:
            conn.settimeout(16)
            with conn.makefile("rwb") as f:
                mod.send(f, {"token": token, "client": ident, "method": method, "args": args})
                return mod.receive(f)
    assert not local("0"*64, secrets.token_hex(16), "inspect", {})["ok"]
    assert not local("0"*64, secrets.token_hex(16), "health", {})["ok"]
    check = local(ready["token"], secrets.token_hex(16), "health", {})
    assert check["ok"] and check["result"]["clientBound"] is False
    assert not local(ready["token"], secrets.token_hex(16), "approve", {})["ok"]
    env = {**os.environ, "MANGOSHOT_BRIDGE_PORT": str(ready["port"]), "MANGOSHOT_BRIDGE_TOKEN": ready["token"]}
    client = subprocess.Popen(command + ["--mcp"], env=env, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    req_id = 0
    def rpc(method, params=None, notification=False):
        global req_id
        message = {"jsonrpc": "2.0", "method": method, "params": params or {}}
        if not notification:
            req_id += 1
            message["id"] = req_id
        client.stdin.write(json.dumps(message).encode() + b"\n")
        client.stdin.flush()
        if notification:
            return None
        return json.loads(client.stdout.readline())
    envelope = {"io.modelcontextprotocol/protocolVersion": "2026-07-28",
                "io.modelcontextprotocol/clientCapabilities": {}}
    discover = rpc("server/discover", {"_meta": envelope})["result"]
    assert discover["resultType"] == "complete" and "2026-07-28" in discover["supportedVersions"]
    assert discover["_meta"]["io.modelcontextprotocol/serverInfo"]["version"] == "0.7.7.2"
    assert rpc("tools/list", {"_meta": {"io.modelcontextprotocol/protocolVersion":"2099-01-01"}})["error"]["code"] == -32022
    assert rpc("tools/list", {"_meta": {"io.modelcontextprotocol/protocolVersion":"2026-07-28"}})["error"]["code"] == -32602
    modern_tools = rpc("tools/list", {"_meta": envelope})["result"]
    assert modern_tools["resultType"] == "complete" and modern_tools["cacheScope"] == "private"
    assert modern_tools["tools"][0]["annotations"]["readOnlyHint"] is True
    assert modern_tools["tools"][-1]["annotations"]["readOnlyHint"] is False
    assert "error" in rpc("tools/call", {"name":"inspect_project"})
    init = rpc("initialize", {"protocolVersion": "2025-11-25", "capabilities": {}, "clientInfo": {"name": "test", "version": "1"}})
    assert init["result"]["protocolVersion"] == "2025-11-25"
    rpc("notifications/initialized", notification=True)
    names = [x["name"] for x in rpc("tools/list")["result"]["tools"]]
    assert names == ["list_commands", "inspect_project", "propose_sequence", "request_frame", "request_status"]
    assert "error" in rpc("tools/call", {"name": "approve"})
    request_id = secrets.token_hex(16)
    seen = []
    def editor():
        while True:
            request = mod.receive(host.stdout)
            if request is None:
                return
            seen.append(request["method"])
            response = {"segments": [{"start": 0, "end": 5}]} if request["method"] == "inspect" else {"requestId": request_id, "status": "pending"}
            if request["method"] == "status":
                response = {"requestId": request_id, "status": "approved", "image": {"mimeType": "image/jpeg", "data": "YWJj"}}
            mod.send(host.stdin, {"type": "response", "id": request["id"], "ok": True, "result": response})
    thread = threading.Thread(target=editor, daemon=True)
    thread.start()
    content = rpc("tools/call", {"_meta": envelope, "name": "inspect_project"})["result"]["content"]
    assert json.loads(content[0]["text"])["segments"][0]["end"] == 5
    assert not local(ready["token"], secrets.token_hex(16), "inspect", {})["ok"], "Second client must be rejected"
    assert local(ready["token"], secrets.token_hex(16), "health", {})["result"]["clientBound"] is True
    proposal = rpc("tools/call", {"name": "propose_sequence", "arguments": {"recipe": {"schema": "mangoshot.sequence.recipe.v1"}}})["result"]
    assert json.loads(proposal["content"][0]["text"])["status"] == "pending"
    frame = rpc("tools/call", {"name": "request_frame", "arguments": {"time": 1}})["result"]
    assert json.loads(frame["content"][0]["text"])["status"] == "pending"
    result = rpc("tools/call", {"name": "request_status", "arguments": {"requestId": request_id}})["result"]
    assert result["content"][1] == {"type": "image", "mimeType": "image/jpeg", "data": "YWJj"}
    assert seen == ["inspect", "propose", "frame", "status"]
    mod.send(host.stdin, {"type": "stop"})
    assert host.wait(timeout=20) == 0
    thread.join(timeout=3)
    assert rpc("tools/call", {"name": "inspect_project"})["result"]["isError"]
    client.stdin.close()
    assert client.wait(timeout=10) == 0
    print("Native framing, authenticated loopback, one paired MCP client, stdio lifecycle, tool allowlist, frame content and disconnect passed")
finally:
    for proc in [client, host]:
        if proc is not None and proc.poll() is None:
            proc.kill()
            proc.wait(timeout=10)
