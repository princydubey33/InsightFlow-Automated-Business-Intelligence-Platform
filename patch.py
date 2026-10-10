import os
import re

files = [
    'src/pages/UploadDataPage.tsx',
    'src/pages/ReportsPage.tsx',
    'src/pages/InsightsPage.tsx',
    'src/pages/DataQualityPage.tsx',
    'src/pages/DashboardOverview.tsx',
    'src/pages/AnalyticsPage.tsx'
]

for fpath in files:
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'authFetch' in content:
        continue
        
    content = re.sub(r'\bawait fetch\(', 'await authFetch(', content)
    
    import_stmt = "import { authFetch } from '../utils/api';\n"
    
    last_import_idx = content.rfind('import ')
    if last_import_idx != -1:
        end_of_line = content.find('\n', last_import_idx)
        content = content[:end_of_line+1] + import_stmt + content[end_of_line+1:]
    else:
        content = import_stmt + content
        
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print(f'Patched {fpath}')
