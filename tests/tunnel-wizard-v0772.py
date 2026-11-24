"""Unit checks for secret-free launcher and strict endpoint handling."""
import importlib.util
import json
import pathlib
import sys
import tempfile
from unittest import mock

ROOT = pathlib.Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("tunnel_wizard", ROOT / "companion" / "tunnel_wizard.py")
w = importlib.util.module_from_spec(spec)
spec.loader.exec_module(w)

def rejects(fn):
    try:
        fn()
    except (ValueError, OSError):
        return
    raise AssertionError("Expected rejection")

cfg = w.make_config("tunnel_" + "a"*32, '"C:/Program Files/MangoShot/Bridge.exe" --mcp', "health-url")
assert cfg["control_plane"]["api_key"] == "env:CONTROL_PLANE_API_KEY"
assert cfg["control_plane"]["base_url"] == "https://api.openai.com"
assert cfg["health"]["listen_addr"] == "127.0.0.1:0"
assert cfg["mcp"]["commands"][0]["channel"] == "main"
assert cfg["mcp"]["max_concurrent_requests"] == 1
assert cfg["mcp"]["stdio_failure_policy"] == "exit"
assert cfg["log"]["http_raw_unsafe"] is False
assert "MANGOSHOT_BRIDGE_TOKEN" not in json.dumps(cfg)
assert w.mcp_command().endswith(" --mcp")
assert w.child_env({"PATH":"test","CONTROL_PLANE_API_KEY":"secret","MCP_COMMAND":"bad","TUNNEL_CLIENT_CONFIG":"bad","HARPOON_TARGETS":"bad","HEALTH_LISTEN_ADDR":"0.0.0.0","LOG_HTTP_RAW_UNSAFE":"true","OPENAI_API_KEY":"secret"}) == {"PATH":"test"}
assert w.port_number("12345") == 12345
rejects(lambda:w.port_number("65536"))
rejects(lambda:w.make_config("not-a-tunnel","x","y"))
assert w.health_address("http://127.0.0.1:12345/") == 12345
for value in ["https://127.0.0.1:80","http://localhost:80","http://127.0.0.1.evil.test:80","http://127.0.0.1:80/path","http://127.0.0.1:80/?q=secret","http://foo@127.0.0.1:80","http://0.0.0.0:80"]:
    rejects(lambda:w.health_address(value))
with tempfile.TemporaryDirectory() as d:
    p = pathlib.Path(d) / "health"
    assert not w.tunnel_ready(p)
    p.write_text("http://example.com:80")
    with mock.patch.object(w.http.client,"HTTPConnection") as connection:
        assert not w.tunnel_ready(p)
        connection.assert_not_called()
    p.write_text("http://127.0.0.1:9876")
    with mock.patch.object(w.http.client,"HTTPConnection") as connection:
        connection.return_value.getresponse.return_value.status = 200
        assert w.tunnel_ready(p)
        connection.assert_called_once_with("127.0.0.1",9876,timeout=2)
        connection.return_value.request.assert_called_once_with("GET","/readyz")
        connection.return_value.getresponse.return_value.status = 503
        assert not w.tunnel_ready(p)
print("Tunnel wizard config isolation, environment allowlist, no literal secrets, loopback readiness and input bounds passed")
