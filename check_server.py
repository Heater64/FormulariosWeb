import socket, sys

s = socket.socket()
s.settimeout(3)
r = s.connect_ex(("localhost", 3003))
if r == 0:
    print("Port 3003 OPEN - server running")
else:
    print("Port 3003 CLOSED - server not running")
s.close()
