"""Read every bounded offline replay chunk with hash and record-count checks."""
import gzip,hashlib,json
from pathlib import Path

def load(ref):
 body=Path(ref['localFile']).expanduser().read_bytes()
 if hashlib.sha256(body).hexdigest()!=ref['sha256']:raise ValueError('Replay source hash mismatch')
 return json.loads(gzip.decompress(body))
def jobs(manifest):
 count=0
 if manifest.get('format')=='bounded-replay-chunks-v1':
  for part in manifest['parts']:
   rows=load(part)['jobs']
   if len(rows)!=part['jobs']:raise ValueError('Replay chunk count mismatch')
   for row in rows:count+=1;yield row
 else:
  for row in load(manifest)['jobs']:count+=1;yield row
 if count!=manifest['jobs']:raise ValueError('Replay total count mismatch')
