#!/usr/bin/env python3
"""MangoShot local native-messaging host / legacy MCP stdio adapter.
No remote listener, arbitrary file paths, shell execution or media persistence.
"""
import argparse
import hmac
import json
import os
import re
import secrets
import socket
import socketserver
import struct
import sys
import threading
import time

VERSION = "0.7.7"
MAX = 512 * 1024
TTL = 1800
HOST = "com.rawpowered.mangoshot.bridge"
SCOPES = {"inspect", "propose", "frame"}
VERSIONS = {"2024-11-05", "2025-03-26", "2025-06-18", "2025-11-25"}
LATEST = "2025-11-25"
ID = re.compile(r"^[a-f0-9-]{16,64}$")
TOKEN = re.compile(r"^[a-f0-9]{64}$")

def unique(pairs):
    result = {}
    for k, v in pairs:
        if k in result:
            raise ValueError("Duplicate JSON key")
        result[k] = v
    return result

def bad_constant(_):
    raise ValueError("Nonfinite JSON")

def decode(data):
    return json.loads(data.decode("utf-8"), object_pairs_hook=unique, parse_constant=bad_constant)

def encode(data):
    payload = json.dumps(data, separators=(",", ":"), ensure_ascii=False, allow_nan=False).encode("utf-8")
    if len(payload) > MAX:
        raise ValueError("Message exceeds bridge limit")
    return payload

def read_exact(stream, n):
    out = bytearray()
    while len(out) < n:
        piece = stream.read(n - len(out))
        if not piece:
            if not out:
                return None
            raise EOFError("Truncated message")
        out.extend(piece)
    return bytes(out)

def receive(stream):
    header = read_exact(stream, 4)
    if header is None:
        return None
    n = struct.unpack("<I", header)[0]
    if not 0 < n <= MAX:
        raise ValueError("Invalid message length")
    body = read_exact(stream, n)
    if body is None:
        raise EOFError("Missing message body")
    return decode(body)

def send(stream, message):
    data = encode(message)
    stream.write(struct.pack("<I", len(data)) + data)
    stream.flush()

def shape(value, keys):
    return isinstance(value, dict) and set(value) == set(keys)

def fail(message):
    return {"ok": False, "error": message}

def schema(properties=None, required=()):
    return {"type": "object", "properties": properties or {}, "required": list(required), "additionalProperties": False}

TOOLS = [
    ("list_commands", "Discover registered Clip Studio edit commands and MangoScript grammar. No media access.", schema(), "catalog"),
    ("inspect_project", "Read scoped timeline metadata. No source bytes, filenames, transcript, graphic text or cursor path.", schema(), "inspect"),
    ("propose_sequence", "Validate a MangoScript sequence against a private draft and queue an in-editor review. Does not apply edits.", schema({"recipe": {"type": "object", "description": "mangoshot.sequence.recipe.v1 JSON envelope"}}, ["recipe"]), "propose"),
    ("request_frame", "Request one rendered frame at edited sequence seconds. User must locally render, review and explicitly share the exact frame.", schema({"time": {"type": "number", "minimum": 0, "maximum": 86400}}, ["time"]), "frame"),
    ("request_status", "Check a request ID. Approved frames are returned once; edit results contain status only. Never applies edits.", schema({"requestId": {"type": "string", "pattern": "^[a-f0-9-]{16,64}$"}}, ["requestId"]), "status"),
]
METHODS = {name: method for name, _, _, method in TOOLS}

def validate(method, args):
    if method in ("catalog", "inspect"):
        if not shape(args, ()):
            raise ValueError("Unexpected arguments")
    elif method == "propose":
        if not shape(args, ("recipe",)) or not isinstance(args["recipe"], dict) or len(encode(args["recipe"])) > 32768:
            raise ValueError("Invalid sequence recipe")
    elif method == "frame":
        if not shape(args, ("time",)) or type(args["time"]) not in (int, float) or not 0 <= args["time"] <= 86400:
            raise ValueError("Invalid frame time")
    elif method == "status":
        if not shape(args, ("requestId",)) or not isinstance(args["requestId"], str) or not ID.fullmatch(args["requestId"]):
            raise ValueError("Invalid request ID")
    else:
        raise ValueError("Unknown method")

class Broker:
    def __init__(self, native_out, scopes, lifetime=TTL):
        self.native_out = native_out
        self.scopes = set(scopes)
        self.token = secrets.token_hex(32)
        self.expires = time.monotonic() + lifetime
        self.client = None
        self.lock = threading.Lock()
        self.write_lock = threading.Lock()
        self.pending = None
        self.closed = False
        broker = self
        class Handler(socketserver.StreamRequestHandler):
            def handle(self):
                self.connection.settimeout(3)
                try:
                    req = receive(self.rfile)
                    result = broker.dispatch(req)
                    send(self.wfile, result)
                except (OSError, EOFError, ValueError, TypeError, RecursionError):
                    try:
                        send(self.wfile, fail("Invalid or interrupted local request"))
                    except OSError:
                        pass
        self.server = socketserver.TCPServer(("127.0.0.1", 0), Handler, bind_and_activate=True)
        self.port = self.server.server_address[1]
        self.thread = threading.Thread(target=self.server.serve_forever, kwargs={"poll_interval": .15}, daemon=True)
        self.thread.start()
        self.timer = threading.Timer(lifetime, self.close)
        self.timer.daemon = True
        self.timer.start()

    def native(self, value):
        with self.write_lock:
            send(self.native_out, value)

    def dispatch(self, req):
        if not shape(req, ("token", "client", "method", "args")):
            return fail("Invalid local request")
        token, client, method, args = req["token"], req["client"], req["method"], req["args"]
        if not isinstance(token, str) or not TOKEN.fullmatch(token) or not hmac.compare_digest(token, self.token):
            return fail("Pairing refused")
        if not isinstance(client, str) or not ID.fullmatch(client) or not isinstance(method, str):
            return fail("Invalid client or method")
        try:
            validate(method, args)
        except (ValueError, TypeError, RecursionError):
            return fail("Invalid tool arguments")
        needed = {"inspect": "inspect", "propose": "propose", "frame": "frame"}.get(method)
        with self.lock:
            if self.closed or time.monotonic() >= self.expires:
                return fail("Session ended")
            if needed and needed not in self.scopes:
                return fail("Scope not granted")
            if self.client is None:
                self.client = client
            if self.client != client:
                return fail("Another MCP client owns this session")
            if self.pending is not None:
                return fail("Bridge busy")
            slot = {"id": secrets.token_hex(16), "event": threading.Event(), "result": None}
            self.pending = slot
        try:
            self.native({"type": "request", "id": slot["id"], "method": method, "args": args})
            slot["event"].wait(12)
            with self.lock:
                if self.closed or time.monotonic() >= self.expires:
                    return fail("Session ended")
                return slot["result"] if slot["result"] is not None else fail("Editor response timed out")
        finally:
            with self.lock:
                if self.pending is slot:
                    self.pending = None

    def reply(self, message):
        if not isinstance(message, dict) or message.get("type") != "response" or type(message.get("ok")) is not bool:
            return
        with self.lock:
            slot = self.pending
            if self.closed or slot is None or slot["id"] != message.get("id") or slot["event"].is_set():
                return
            if message["ok"] and shape(message, ("type", "id", "ok", "result")):
                slot["result"] = {"ok": True, "result": message["result"]}
            elif not message["ok"] and shape(message, ("type", "id", "ok", "error")) and isinstance(message["error"], str):
                slot["result"] = fail(message["error"][:240])
            else:
                slot["result"] = fail("Invalid editor response")
            slot["event"].set()

    def close(self):
        with self.lock:
            if self.closed:
                return
            self.closed = True
            self.token = ""
            if self.pending:
                self.pending["event"].set()
        self.timer.cancel()
        self.server.shutdown()
        self.server.server_close()

def native_main():
    broker = None
    try:
        first = receive(sys.stdin.buffer)
        if not shape(first, ("type", "scopes")) or first["type"] != "start" or not isinstance(first["scopes"], list) or not first["scopes"] or any(not isinstance(s, str) or s not in SCOPES for s in first["scopes"]):
            send(sys.stdout.buffer, {"type": "error", "error": "Invalid session start"})
            return 1
        broker = Broker(sys.stdout.buffer, first["scopes"])
        broker.native({"type": "ready", "port": broker.port, "token": broker.token, "expiresIn": TTL})
        while True:
            message = receive(sys.stdin.buffer)
            if message is None or message == {"type": "stop"}:
                break
            broker.reply(message)
        return 0
    except (OSError, ValueError, EOFError, TypeError, RecursionError):
        # Native stdout is binary protocol only; never log credentials or content.
        return 1
    finally:
        if broker is not None:
            broker.close()

class MCP:
    def __init__(self, call):
        self.call = call
        self.initialized = False
        self.ready = False

    def handle(self, r):
        if not isinstance(r, dict) or r.get("jsonrpc") != "2.0" or not isinstance(r.get("method"), str):
            return self.error(None, -32600, "Invalid Request")
        ident = r.get("id")
        if "id" in r and (type(ident) not in (int, str) or isinstance(ident, str) and len(ident) > 128):
            return self.error(None, -32600, "Invalid request ID")
        m, p = r["method"], r.get("params", {})
        if "id" not in r:
            if m == "notifications/initialized" and self.initialized:
                self.ready = True
            return None
        def result(value):
            return {"jsonrpc": "2.0", "id": ident, "result": value}
        if m == "initialize":
            if self.initialized or not isinstance(p, dict) or not isinstance(p.get("protocolVersion"), str):
                return self.error(ident, -32602, "Invalid initialize")
            v = p["protocolVersion"]
            self.initialized = True
            return result({"protocolVersion": v if v in VERSIONS else LATEST, "capabilities": {"tools": {}}, "serverInfo": {"name": "MangoShot Intelligence Bridge", "version": VERSION}, "instructions": "Local Clip Studio session only. Proposals and frame requests require explicit approval inside MangoShot. Poll request_status with returned ID. No tool applies edits directly."})
        if m == "ping":
            return result({})
        if not self.ready:
            return self.error(ident, -32601 if m == "server/discover" else -32002, "Use the legacy initialize handshake")
        if m == "tools/list":
            return result({"tools": [{"name": n, "description": d, "inputSchema": s} for n, d, s, _ in TOOLS]})
        if m == "tools/call":
            if not isinstance(p, dict) or not isinstance(p.get("name"), str) or p["name"] not in METHODS:
                return self.error(ident, -32602, "Unknown tool")
            method, args = METHODS[p["name"]], p.get("arguments", {})
            try:
                validate(method, args)
                response = self.call(method, args)
                if not isinstance(response, dict):
                    raise ValueError("Missing bridge response")
                if not response.get("ok"):
                    return result({"isError": True, "content": [{"type": "text", "text": str(response.get("error", "Bridge refused"))[:240]}]})
                data = response["result"]
                if method == "status" and isinstance(data, dict) and "image" in data:
                    image = data["image"]
                    if not shape(image, ("mimeType", "data")) or image["mimeType"] != "image/jpeg" or not isinstance(image["data"], str) or len(image["data"]) > 300000 or not re.fullmatch(r"[A-Za-z0-9+/=]+", image["data"]):
                        raise ValueError("Invalid approved image")
                    meta = {k: v for k, v in data.items() if k != "image"}
                    return result({"content": [{"type": "text", "text": json.dumps(meta, ensure_ascii=False)}, {"type": "image", "mimeType": image["mimeType"], "data": image["data"]}]})
                return result({"content": [{"type": "text", "text": json.dumps(data, ensure_ascii=False)}]})
            except (OSError, EOFError, ValueError, TypeError, KeyError, RecursionError):
                return result({"isError": True, "content": [{"type": "text", "text": "Invalid request or local editor disconnected"}]})
        return self.error(ident, -32601, "Method not found")

    @staticmethod
    def error(ident, code, message):
        return {"jsonrpc": "2.0", "id": ident, "error": {"code": code, "message": message}}

def mcp_main():
    # Token is passed via client environment, not argv or a file written by MangoShot.
    port_text, token = os.environ.get("MANGOSHOT_BRIDGE_PORT", ""), os.environ.get("MANGOSHOT_BRIDGE_TOKEN", "")
    if not port_text.isdecimal() or len(port_text) > 5 or not 1 <= int(port_text) <= 65535 or not TOKEN.fullmatch(token):
        print("Set the current pairing port and token from MangoShot.", file=sys.stderr)
        return 2
    port, client = int(port_text), secrets.token_hex(16)
    def call(method, args):
        with socket.create_connection(("127.0.0.1", port), timeout=3) as conn:
            conn.settimeout(16)
            with conn.makefile("rwb") as f:
                send(f, {"token": token, "client": client, "method": method, "args": args})
                return receive(f)
    mcp = MCP(call)
    while True:
        line = sys.stdin.buffer.readline(MAX + 1)
        if not line:
            return 0
        if len(line) > MAX:
            return 1
        try:
            reply = mcp.handle(decode(line))
        except (ValueError, TypeError, RecursionError):
            reply = MCP.error(None, -32700, "Parse error")
        if reply is not None:
            try:
                sys.stdout.buffer.write(encode(reply) + b"\n")
                sys.stdout.buffer.flush()
            except (ValueError, OSError):
                return 1

if __name__ == "__main__":
    if os.name == "nt":
        import msvcrt
        msvcrt.setmode(sys.stdin.fileno(), os.O_BINARY)
        msvcrt.setmode(sys.stdout.fileno(), os.O_BINARY)
    # Chrome supplies its allowed origin and Windows parent handle; Firefox supplies
    # manifest path and add-on ID. The browser-installed manifest is the origin gate.
    if sys.argv[1:] == ["--mcp"]:
        sys.exit(mcp_main())
    sys.exit(native_main())
