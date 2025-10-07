from http.server import BaseHTTPRequestHandler, HTTPServer
import urllib.parse as up

PORT = 1455

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = up.urlparse(self.path)
        qs = up.parse_qs(parsed.query)
        print("Full path:", self.path)
        print("code =", qs.get("code"))
        self.send_response(200)
        self.send_header("Content-type","text/html")
        self.end_headers()
        self.wfile.write(b"<html><body><h2>OK — you can close this page.</h2></body></html>")

print(f"Listening on http://localhost:{PORT}/ ...")
server = HTTPServer(("localhost", PORT), Handler)
server.handle_request()
server.server_close()
