# Deploy Worker Skill

**Trigger:** `/deploy-worker`

## What this skill does

SSH into the Hetzner VPS, pull latest code, restart the worker service, and verify it's healthy.

## Connection details

- **Host:** 5.161.60.37
- **User:** root
- **Password:** Zeeza_het@6996
- **Port:** 22
- **App path:** /opt/jobezee
- **Worker port:** 8001

## Steps (execute in order)

1. SSH into server using Paramiko:
```python
import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect("5.161.60.37", username="root", password="Zeeza_het@6996")
```

2. Pull latest code:
```bash
cd /opt/jobezee && git pull origin main
```

3. Restart worker service:
```bash
systemctl restart jobezee-worker
```

4. Wait 3 seconds, then health check:
```bash
sleep 3 && curl -s http://localhost:8001/health
```

5. Report back:
- Show health check response (active jobs, queued jobs, secrets loaded)
- If restart failed, show `systemctl status jobezee-worker --no-pager`

## Full deploy script

```python
import paramiko, time, json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect("5.161.60.37", username="root", password="Zeeza_het@6996")

commands = [
    "cd /opt/jobezee && git pull origin main",
    "systemctl restart jobezee-worker",
]
for cmd in commands:
    stdin, stdout, stderr = client.exec_command(cmd)
    print(stdout.read().decode())
    err = stderr.read().decode()
    if err: print("STDERR:", err)

time.sleep(3)
_, out, _ = client.exec_command("curl -s http://localhost:8001/health")
health = out.read().decode()
print("Worker health:", health)
client.close()
```

## After deploy checklist

- [ ] Health endpoint returns 200 with valid JSON
- [ ] `secrets_loaded` > 0 in health response
- [ ] No active jobs stuck from before restart
- [ ] Worker service status is `active (running)`
