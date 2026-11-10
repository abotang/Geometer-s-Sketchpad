"""Build the offline WPS guide. Maintainers only: pip install Markdown."""
from pathlib import Path
import markdown

ROOT = Path(__file__).resolve().parent.parent
source = (ROOT / 'docs' / '使用手册.md').read_text(encoding='utf-8')
toc_start = source.index('## 目录')
toc_end = source.index('## 1 准备环境和下载项目', toc_start)
source = source[:toc_start] + '[TOC]\n\n' + source[toc_end:]
body = markdown.markdown(source, extensions=['toc', 'tables', 'fenced_code'],
                         extension_configs={'toc': {'title': '目录', 'toc_depth': '2-3'}})
body = body.replace('src="assets/', 'src="docs/assets/').replace('href="../examples/', 'href="examples/')
style = """
:root{color-scheme:light}*{box-sizing:border-box}body{margin:0;background:#f3f6f5;color:#20353e;font:16px/1.85 system-ui,'Microsoft YaHei',sans-serif}
main{max-width:1060px;margin:32px auto;padding:34px 48px;background:white;border-radius:12px}h1{font-size:30px;line-height:1.4}h2{font-size:24px;margin-top:48px;border-bottom:1px solid #d9e4e1;padding-bottom:10px}h3{font-size:19px;margin-top:30px}
a{color:#086c86;overflow-wrap:anywhere}img{display:block;width:100%;height:auto;border:1px solid #d9e4e1;border-radius:8px}table{border-collapse:collapse;width:100%;font-size:14px;table-layout:fixed;margin:18px 0}td,th{border:1px solid #d5e0dd;padding:10px 12px;text-align:left;vertical-align:top;overflow-wrap:anywhere}th{background:#edf5f3}
code{background:#edf3f2;border-radius:4px;padding:2px 5px;font-family:Consolas,monospace;overflow-wrap:anywhere}pre{overflow:auto;background:#eef4f2;padding:16px;border-radius:8px;font-size:13px;line-height:1.6}pre code{padding:0}.toc{background:#f0f6f4;border-radius:8px;padding:16px 24px}.toc>ul{columns:2;column-gap:32px}.toc li{break-inside:avoid}.toc a{text-decoration:none}.toc ul{padding-left:20px}.toctitle{font-size:20px;font-weight:700}li{margin:5px 0}
.guide-actions{display:flex;gap:16px;flex-wrap:wrap;font-size:13px;border-bottom:1px solid #d9e4e1;padding-bottom:14px}p{overflow-wrap:anywhere}
@media(max-width:720px){main{margin:0;padding:22px 16px;border-radius:0}.toc>ul{columns:1}h1{font-size:25px}td,th{padding:7px;font-size:12px}}
@media print{body{background:white;font-size:11pt}main{margin:0;padding:0;max-width:none}.guide-actions{display:none}.toc>ul{columns:1}h2,h3{break-after:avoid}table{font-size:9pt}tr,img,pre{break-inside:avoid}a{color:inherit;text-decoration:none}pre{white-space:pre-wrap}}
"""
html = '<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>几何实验室完整使用手册</title><style>' + style + '</style></head><body><main><nav class="guide-actions"><a href="https://github.com/abotang/Geometer-s-Sketchpad">GitHub 项目</a><span>可离线阅读 · 浏览器 Ctrl+P 可打印或保存 PDF</span></nav>' + body + '</main></body></html>\n'
(ROOT / 'wps-help.html').write_text(html, encoding='utf-8')
print('Built wps-help.html from docs/使用手册.md')
