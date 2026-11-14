# Chota

Chota is a browser app for manual content analysis. You read each article as a PDF and answer your codebook questions on the same screen, then export the coded data to SPSS, Excel, CSV, R or Python.

Anyone can use it for their own project. It starts with an empty codebook. You write your own questions, list your outlets and set your own target. It was first built for a study of about 940 newspaper articles on AI, and that study's questions are available as an example under **Load example questions** on the Codebook screen.

## Getting started

1. Open Chota. In the **Codebook** screen, add your questions, or paste them all at once (see the format below).
2. Optional: in **Settings**, list your outlets as `Outlet = Country`, and set a target, a deadline and words to highlight.
3. Open the **Library**. In Chrome or Edge, click **Save to a folder…** and choose the folder that holds your PDFs. In other browsers, click **Add PDFs**.
4. Code each article and press `Enter` to save and move to the next one. Export when you're done.

## What Chota fills in from each PDF

When you add PDFs, Chota reads the text of each article's first page and fills in:

| Detail | How it's found |
|---|---|
| Outlet and country | An outlet from your Settings list appears on the first page or in the file name |
| Date and year | The first date written like `March 3, 2025` or `3 March 2025`. If there's none, a year in the file name |
| Headline | The first line that isn't a page number, date, outlet name or database label |
| Word count | A `Length: 850 words` line, which Nexis Uni adds |
| Article boundaries | Nexis Uni batch PDFs are split into articles at `Page 1 of N` or `End of Document`. Any other PDF counts as one article |

Check these details on each article. Click **Edit details** above the questions to correct them or type them in. Outlets you type that aren't in your list still get numeric codes in the export. These rules were written for Nexis Uni downloads. PDFs from other sources (ProQuest, Factiva, a newspaper's website) work too, but you may need to type in the outlet or fix the headline, and use **Split** to separate articles in a combined PDF.

## What it does

- Opens article PDFs next to the coding sheet. Nexis batch PDFs are split into articles automatically, and Split and Merge fix any mistakes.
- Reads the outlet, country, date and headline from each article's first page.
- Puts each question on one line with Yes/No buttons or numbered categories. The keyboard is enough: `1`/`0` or `Y`/`N` to answer, `Enter` to save and move to the next article.
- Saves after every article, to a folder on your computer or in the browser (see below). It shows your daily pace against a target and deadline.
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

Nothing is uploaded. Your PDFs and codes stay on your own computer, which also keeps licensed articles (such as Nexis downloads) off any server.

## Where your work is saved

**In Chrome or Edge, save to a folder (recommended).** In the Library, click **Save to a folder…** and choose a folder, for example one in OneDrive. Chota then:

- opens every PDF in that folder and its subfolders. Subfolders appear as library folders.
- copies PDFs you add later into the folder.
- saves your codes, codebook and settings to `chota-codes.json` in the folder after every article.
- keeps a dated copy of that file in `chota-backups/` each day you open it.

On later visits, Chota asks to reopen the folder. Click **Open folder** and allow access. If you choose "Allow on every visit", Chrome stops asking.

**In Firefox or Safari, Chota saves in the browser.** Your PDFs and codes are kept in that browser between visits. Clearing browser data erases them, so download a backup from Export at the end of each session.

### Coding as a team

Share one folder of PDFs (for example a shared OneDrive or Teams folder). Each coder types their name when choosing the folder and gets their own codes file, such as `chota-codes-amaka.json`. Coders never overwrite each other's codes. To combine or compare coders, open each file with Restore from a backup on the Export screen, or read the JSON files in R or Python.

**Remove** on a PDF hides it from your library. It does not delete the file from the folder.

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

After editing anything in `src/`, run `python build.py` (`python3 build.py` on Mac).

Libraries are loaded from cdnjs: pdf.js 3.11.174, SheetJS 0.18.5 and JSZip 3.10.1.
