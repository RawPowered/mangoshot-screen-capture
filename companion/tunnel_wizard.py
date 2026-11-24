"""Interactive, local-only launcher for the official OpenAI tunnel-client.
No browser-triggered process execution, API-key storage, installation or account changes.
"""
import getpass
import http.client
import json
import os
import pathlib
import re
import secrets
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import warnings
from urllib.parse import urlsplit

TUNNEL_ID = re.compile(r"^tunnel_[a-fA-F0-9]{32}$")
PORT = re.compile(r"^[0-9]{1,5}$")
# The official client is installed separately by the operator; never download or
# execute a binary supplied by an incoming browser/MCP message.
ALLOWED_ENV = {"PATH", "SYSTEMROOT", "WINDIR", "SYSTEMDRIVE", "COMSPEC", "PATHEXT",
               "TEMP", "TMP", "TMPDIR", "USERPROFILE", "LOCALAPPDATA", "APPDATA",
               "HOMEDRIVE", "HOMEPATH", "HOME", "LANG", "LC_ALL", "PROGRAMDATA",
               "PROGRAMFILES", "PROGRAMFILES(X86)", "NUMBER_OF_PROCESSORS",
               "PROCESSOR_ARCHITECTURE", "SSL_CERT_FILE", "SSL_CERT_DIR",
               "HTTPS_PROXY", "HTTP_PROXY", "NO_PROXY"}

def child_env(source):
    return {k: v for k, v in source.items() if k.upper() in ALLOWED_ENV}

def port_number(raw):
    if not PORT.fullmatch(raw) or not 1 <= int(raw) <= 65535:
        raise ValueError("Invalid pairing port")
    return int(raw)

def mcp_command():
    # The upstream client splits a command string then calls exec.Command,
    # not a shell. Forward slashes avoid Windows path backslash escaping.
    parts = [pathlib.Path(sys.executable).resolve().as_posix()]
    if not getattr(sys, "frozen", False):
        parts.append(pathlib.Path(__file__).resolve().with_name("mangoshot_bridge.py").as_posix())
    if any('"' in p or "\n" in p or "\r" in p for p in parts):
        raise ValueError("Unsupported companion installation path")
    return " ".join('"' + p + '"' for p in parts) + " --mcp"

def make_config(tunnel_id, command, health_file):
    if not TUNNEL_ID.fullmatch(tunnel_id):
        raise ValueError("Invalid OpenAI tunnel ID")
    return {
        "config_version": 1,
        "control_plane": {"base_url": "https://api.openai.com", "tunnel_id": tunnel_id,
                          "api_key": "env:CONTROL_PLANE_API_KEY"},
        "mcp": {"commands": [{"channel": "main", "command": command}],
                "max_concurrent_requests": 1, "stdio_failure_policy": "exit",
                "stdio_send_initialized_notification": True},
        "health": {"listen_addr": "127.0.0.1:0", "url_file": str(health_file)},
        "log": {"level": "warn", "http_raw_unsafe": False},
        "admin_ui": {"open_browser": False},
    }

def health_address(value):
    url = urlsplit(value.strip())
    if (url.scheme != "http" or url.hostname != "127.0.0.1" or
            url.username is not None or url.password is not None or url.path not in ("", "/")
            or url.query or url.fragment or not url.port):
        raise ValueError("Invalid local health endpoint")
    return url.port

def tunnel_ready(health_file):
    try:
        with open(health_file, "r", encoding="utf-8") as stream:
            value = stream.read(512)
        port = health_address(value)
        conn = http.client.HTTPConnection("127.0.0.1", port, timeout=2)
        try:
            conn.request("GET", "/readyz")
            response = conn.getresponse()
            return response.status == 200
        finally:
            conn.close()
    except (OSError, ValueError, http.client.HTTPException):
        return False

def local_health(send, receive, port, token):
    with socket.create_connection(("127.0.0.1", port), timeout=3) as conn:
        conn.settimeout(16)
        with conn.makefile("rwb") as stream:
            send(stream, {"token": token, "client": secrets.token_hex(16),
                          "method": "health", "args": {}})
            response = receive(stream)
    if not isinstance(response, dict) or response.get("ok") is not True:
        raise PermissionError("Pairing refused or expired. Re-pair the current video.")
    result = response.get("result")
    if (not isinstance(result, dict) or type(result.get("remainingSeconds")) is not int
            or type(result.get("clientBound")) is not bool):
        raise ValueError("Incompatible companion health response")
    return result

def secret_input(prompt):
    # Fail closed instead of falling back to an echoed terminal prompt.
    with warnings.catch_warnings():
        warnings.simplefilter("error", getpass.GetPassWarning)
        return getpass.getpass(prompt).strip()

def binary_path(raw):
    path = pathlib.Path(raw.strip().strip('"')).expanduser().resolve(strict=True)
    if not path.is_file() or path.name.lower() not in ("tunnel-client", "tunnel-client.exe"):
        raise ValueError("Select the official full tunnel-client executable")
    return path

def run_wizard(send, receive, token_pattern, version):
    if not sys.stdin.isatty():
        print("Open a local interactive PowerShell or terminal to use the wizard.", file=sys.stderr)
        return 2
    print("MangoShot ChatGPT Connection Wizard " + version)
    print("Use a private OpenAI tunnel associated with your workspace.")
    print("Download and verify the official tunnel-client first:")
    print("https://github.com/openai/tunnel-client/releases/latest")
    print("https://platform.openai.com/settings/organization/tunnels")
    child = None
    try:
        found = shutil.which("tunnel-client")
        raw = input("Full path to trusted tunnel-client executable" + (" [Enter for PATH version]" if found else "") + ": ").strip()
        binary = binary_path(raw or found or "")
        # Explicit user-selected local program, no shell, no secret environment yet.
        probe_env = child_env(os.environ)
        probe = subprocess.run([str(binary), "--version"], env=probe_env,
                               stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                               stderr=subprocess.DEVNULL, timeout=10)
        if probe.returncode:
            raise ValueError("Official tunnel-client version check failed")
        tunnel_id = input("OpenAI tunnel ID: ").strip()
        if not TUNNEL_ID.fullmatch(tunnel_id):
            raise ValueError("Expected tunnel_ followed by 32 hexadecimal characters")
        port = port_number(input("MangoShot pairing port: ").strip())
        token = secret_input("MangoShot pairing token (hidden): ")
        if not token_pattern.fullmatch(token):
            raise ValueError("Invalid pairing token")
        health = local_health(send, receive, port, token)
        if health["remainingSeconds"] < 60:
            raise ValueError("Less than one minute remains; re-pair first")
        if health["clientBound"]:
            raise ValueError("Another client already owns the pair. Disconnect and re-pair before using ChatGPT.")
        print("Local pairing verified; no MCP client slot consumed.")
        key = secret_input("Restricted OpenAI runtime API key (hidden): ")
        if not 10 <= len(key) <= 512 or any(c.isspace() for c in key):
            raise ValueError("Invalid runtime API key")
        if input("Start private outbound tunnel now? [y/N]: ").strip().lower() not in ("y", "yes"):
            print("Canceled; no tunnel started.")
            return 0
        # No secrets in command line, profile files, output or persistent settings.
        # A short-lived private directory holds only a nonsecret configuration and
        # a loopback health URL. Existing tunnel-client profiles are not loaded.
        with tempfile.TemporaryDirectory(prefix="mangoshot-tunnel-") as directory:
            base = pathlib.Path(directory)
            health_file = base / "health-url"
            config = base / "tunnel.json"
            config.write_text(json.dumps(make_config(tunnel_id, mcp_command(), health_file)), encoding="utf-8")
            env = {**probe_env, "CONTROL_PLANE_API_KEY": key,
                   "MANGOSHOT_BRIDGE_PORT": str(port), "MANGOSHOT_BRIDGE_TOKEN": token}
            try:
                child = subprocess.Popen([str(binary), "run", "--config", str(config)],
                                         cwd=str(base), env=env, stdin=subprocess.DEVNULL,
                                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                print("Tunnel process launched. Waiting for local readiness. Ctrl+C stops it.")
                del key
                env.clear()
                last = None
                failures = 0
                deadline = time.monotonic() + 90
                while child.poll() is None:
                    try:
                        health = local_health(send, receive, port, token)
                        if health["remainingSeconds"] <= 0:
                            print("MangoShot pairing expired.")
                            break
                        failures = 0
                    except PermissionError:
                        print("MangoShot session revoked.")
                        break
                    except (OSError, EOFError, ValueError, TypeError):
                        failures += 1
                        if failures >= 3:
                            print("Local bridge unavailable. Stopping tunnel.")
                            break
                    ready = tunnel_ready(health_file)
                    if ready != last:
                        print("Tunnel readiness: " + ("READY" if ready else "not ready"))
                        if ready:
                            print("In ChatGPT: Plugins > + > Add custom MCP server > Tunnel.")
                            print("Select your private tunnel and test inspect_project. Readiness alone does not verify a ChatGPT call.")
                        last = ready
                    if not ready and time.monotonic() >= deadline:
                        print("Tunnel readiness timed out. Verify runtime key, tunnel permissions, workspace association and official client version.")
                        break
                    if ready:
                        deadline = time.monotonic() + 90
                    time.sleep(2)
                if child.poll() is not None:
                    print("Tunnel client exited (code " + str(child.returncode) + "). Recheck the official client and tunnel configuration.")
                    return child.returncode or 0
                return 0
            finally:
                env.clear()
                if child is not None and child.poll() is None:
                    child.terminate()
                    try:
                        child.wait(timeout=8)
                    except subprocess.TimeoutExpired:
                        child.kill()
                        child.wait(timeout=5)
                print("Tunnel stopped. Disconnect/re-pair MangoShot before restarting a client.")
    except KeyboardInterrupt:
        print("\nCanceled.")
        return 0
    except (OSError, EOFError, ValueError, PermissionError, getpass.GetPassWarning, subprocess.SubprocessError):
        # Avoid printing arbitrary subprocess output or input/exception contents.
        print("Setup failed. Check the trusted client path, current pair, tunnel ID, and credentials locally. No credentials were saved by MangoShot.", file=sys.stderr)
        return 2
