# Chota

Chota is a browser app for manual content analysis. You read each article as a PDF and answer the codebook questions on the same screen, then export the coded data to SPSS, Excel, CSV, R or Python.

It was built for coding about 940 newspaper articles on AI from eight countries, but the codebook, outlets and settings are all editable.

## What it does

- Opens article PDFs next to the coding sheet. Nexis batch PDFs are split into articles automatically, and Split and Merge fix any mistakes.
- Reads the outlet, country, date and headline from each article's first page.
- Puts each question on one line with Yes/No buttons or numbered categories. The keyboard is enough: `1`/`0` or `Y`/`N` to answer, `Enter` to save and move to the next article.
- Saves after every article. It shows your daily pace against a target and deadline.
- Has a text view with your search terms highlighted, and light and dark modes.
- Keeps PDFs in a library with folders, and can sort them by country, outlet and year automatically.
- Checks intracoder reliability. It draws a random subsample, hides your first codes while you recode, and reports percent agreement and Krippendorff's alpha (nominal) for each variable.
- Exports:
  - SPSS `.sav` with variable and value labels
  - Excel with a codebook sheet
  - CSV
  - an R and Python bundle with loader scripts
  - a full JSON backup

## Running it

Open `index.html` in a browser, or publish the repository with GitHub Pages (Settings, Pages, deploy from the `main` branch).

Codes, the codebook and settings are kept in your browser's local storage. Download a backup from Export at the end of each session, since clearing browser data erases them. PDFs have to be added again each visit.

## Codebook format

You can paste a codebook in the Codebook screen, one question per line:

```
name | question | type | coding rule
market | Is AI presented as a market? | binary | Products, investment, jobs, revenue
dominant | Which orientation gets the most space? | single: 1=Market; 2=Governance; 3=Capability; 4=None
notes | Notes | text
```

`binary` exports as 1 = Yes and 0 = No. Questions left unanswered export as missing.

## Project layout

```
index.html      built app, one self-contained file
src/shell.html  markup and styles
src/main.js     app logic
src/lib.js      SPSS .sav writer and Krippendorff's alpha
build.py        joins src/ into index.html
```

After editing anything in `src/`, run `python3 build.py`.

Libraries are loaded from cdnjs: pdf.js 3.11.174, SheetJS 0.18.5 and JSZip 3.10.1.
