"""Read official bulk definitions without treating absence as no API publication.
Requires the separately retained public archive; performs no network calls.
"""
from pathlib import Path
import hashlib,json,zipfile
ARCHIVE=Path.home()/'Documents/EIAapp-Evidence/20261029/coverage/source-pages/electricity-bulk-20261023.zip'
EXPECTED_SHA='73e289b5e23c28922f1c47686282f00e1459abee0376242862f17bfc2ada1f6b'

def scan(path):
    with path.open('rb') as stream:digest=hashlib.file_digest(stream,'sha256').hexdigest()
    if digest!=EXPECTED_SHA:raise ValueError('Archive changed; review its source before comparison')
    counts={'OB2':0,'OBW':0,'95':0};lines=0;matches=[]
    with zipfile.ZipFile(path) as z:
        if z.namelist()!=['ELEC.txt']:raise ValueError('Unexpected archive structure')
        with z.open('ELEC.txt') as f:
            for line in f:
                lines+=1
                if not any(t in line for t in [b'.OB2-',b'.OBW-',b'-95.']):continue
                row=json.loads(line);sid=row.get('series_id','')
                if not sid.startswith('ELEC.'):continue
                tags=[code for code,token in [('OB2','.OB2-'),('OBW','.OBW-'),('95','-95.')] if token in sid]
                if not tags:continue
                for code in tags:counts[code]+=1
                matches.append({k:v for k,v in row.items() if k!='data'})
    return {'url':'https://www.eia.gov/opendata/bulk/ELEC.zip','localFile':str(path),'sha256':digest,'bytes':path.stat().st_size,'member':'ELEC.txt','linesScanned':lines,'seriesMatchesByNativeCode':counts,'definitionMatches':matches,'limitation':'This archive contains no matching series definitions. It does not prove that the API codes are invalid or unpublished. Existing API observations remain preserved. No scope classification inferred from absence.'}
if __name__=='__main__':print(json.dumps(scan(ARCHIVE),indent=2))
