import urllib.request, json, time, sys

api = 'rnd_sjPqQNDkUNymS2GxUjuAOtbPtDN3'
svc = 'srv-d6vh27ggjchc73b2etfg'

def get_deploy():
    req = urllib.request.Request(
        f'https://api.render.com/v1/services/{svc}/deploys?limit=1',
        headers={'Authorization': f'Bearer {api}'}
    )
    r = urllib.request.urlopen(req, timeout=10)
    deploys = json.loads(r.read())
    return deploys[0]['deploy'] if deploys else {}

def get_logs(deploy_id):
    req = urllib.request.Request(
        f'https://api.render.com/v1/services/{svc}/deploys/{deploy_id}/logs',
        headers={'Authorization': f'Bearer {api}'}
    )
    try:
        r = urllib.request.urlopen(req, timeout=10)
        return json.loads(r.read())
    except:
        return []

# Poll until done
print("Polling deploy status...")
for i in range(60):
    d = get_deploy()
    status = d.get('status', 'unknown')
    print(f"  [{i*10}s] status: {status}")
    if status in ('live', 'deactivated', 'build_failed', 'update_failed', 'canceled'):
        break
    time.sleep(10)

d = get_deploy()
status = d.get('status')
deploy_id = d.get('id')
print(f"\nFinal status: {status}")
print(f"Deploy ID:    {deploy_id}")

# Get logs
logs = get_logs(deploy_id)
if logs:
    print("\n--- Last 50 log lines ---")
    lines = logs if isinstance(logs, list) else logs.get('lines', [])
    for line in lines[-50:]:
        if isinstance(line, dict):
            print(line.get('message', line))
        else:
            print(line)
else:
    print("(no logs via API)")

sys.exit(0 if status == 'live' else 1)
