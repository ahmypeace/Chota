"""Build the single-file app: python3 build.py  ->  index.html"""
from pathlib import Path

src = Path(__file__).parent / "src"
read = lambda name: (src / name).read_text(encoding="utf-8")
lib = read("lib.js").replace(
    "if (typeof module !== 'undefined') module.exports = { writeSav, kAlphaNominal };", "")
html = read("shell.html").replace("/*LIB*/", lib).replace("/*MAIN*/", read("main.js"))
(Path(__file__).parent / "index.html").write_text(html, encoding="utf-8", newline="\n")
print("index.html written")
