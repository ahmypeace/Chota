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
| Article boundaries | Batch PDFs are split into articles: Nexis Uni at `Page 1 of N` or `End of Document`, ProQuest at `Document 3 of 50`, Factiva at the `Document` line with the Factiva ID that ends each article. Splits happen at page breaks. Any other PDF counts as one article |

Check these details on each article. Click **Edit details** above the questions to correct them or type them in. Outlets you type that aren't in your list still get numeric codes in the export. These rules were written for Nexis Uni downloads. The ProQuest and Factiva markers follow those databases' usual export layout but haven't been tested on real exports. If a batch isn't split correctly, use **Split** and **Merge**. A sampling log (see below) can supply the details instead.

## What it does

- Opens article PDFs next to the coding sheet. Nexis batch PDFs are split into articles automatically, and Split and Merge fix any mistakes.
- Reads the outlet, country, date and headline from each article's first page.
- Puts each question on one line with Yes/No buttons or numbered categories. The keyboard is enough: `1`/`0` or `Y`/`N` to answer, `Enter` to save and move to the next article.
- Saves after every article, to a folder on your computer or in the browser (see below). It shows your daily pace against a target and deadline.
- Has a text view with your search terms highlighted, and light and dark modes.
- Keeps PDFs in a library with folders, and can sort them by country, outlet and year automatically.
- Checks answers against the codebook before saving, for example that the dominant framing is one of the framings coded Yes.
- Asks for a reason whenever an article is excluded.
- In the text view, numbers the paragraphs (P1, P2…). Selecting a passage offers **Add to note**, which adds the quote and its paragraph number to your note question.
- Reliability: compares coders, or you against yourself on a recoded sample. Reports percent agreement and Krippendorff's alpha (nominal, ordinal or interval, following each question's measure) with a 95% bootstrap interval, and lists every disagreement to settle.
- Exports:
  - SPSS `.sav` with variable labels, value labels, missing values, measure levels and full-length text
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

## Sampling log

In **Settings**, import the spreadsheet of sampled articles (.xlsx or .csv). Chota matches each article to its row by headline or PDF file name. It then fills in:

- the outlet, country, date, year and headline, from columns with those names
- any question whose name matches a column. `V1_ARTICLE_ID` is filled from `ARTICLE_ID`

Every column of the log is added to the export, so outlet-level variables such as GDP per capita end up in the same SPSS file.

## Reliability

**Compare coders.** Each coder saves to their own `chota-codes-name.json` in a shared folder, or downloads a backup from Export. On the Reliability screen, load the other coders' files, or click **Use the codes files in my folder**. Articles coded by two or more people are compared. Each variable gets percent agreement, Krippendorff's alpha and a 95% interval from 1,000 bootstrap resamples of the articles. Disagreements are listed article by article, and the list can be downloaded to settle them.

**Recode a sample.** With one coder, draw a random sample and recode it about a week later, without seeing your first codes.

Alpha follows each question's measure: nominal, ordinal, or interval for Scale questions. Skipped questions and missing-value codes (such as 98) are left out of the calculation.

## Your codebook

### Importing it

On the Codebook screen, **Import a codebook…** reads a Word (.docx) or text file in which each variable starts with a number such as `V3`:

```
V3  ELIGIBLE                                      V1 Does the account have a profile photo?
Question | Is AI a substantive subject?           0=Egg (skip to Section 2)
Codes | 0 No; 1 Yes                               1=other image
Skip | If 0, stop and log the reason.
```

Chota picks up:

- each question's codes
- write-in questions
- codes used throughout, such as `97 | Not applicable` and `98 | Cannot determine`
- skip instructions: "If 0, stop", "If 0, code V11 = 97 and V12 = 97", "skip to V9" and "skip to Section 2"

It shows you what it found before replacing anything. Check the result, especially conditional skips such as "if V2 is also 0", which have to be set by hand.

### Skip rules

Each question can have rules such as **If the answer is 0, then end coding and mark the article excluded**, **end coding**, or **skip to V11**. While coding, skipped questions are greyed out and don't need answers. When coding ends, press `Enter` to save.

### Skipped and missing codes

- **Code for skipped questions** (for example 97): skipped questions get this code in the data. That keeps them separate from questions a coder left empty.
- **Missing-value codes** (for example 97, 98): these stay in the data, but are marked as user-missing in the SPSS file. The R and Python loaders make a `d_analysis` copy in which they are NA. Either way they drop out of percentages and models, and the codes are still there to report.

Codes with two digits can be typed on the keyboard: press `9` then `8` for 98.

### Checks

A categories question can be linked to earlier Yes/No questions, for example `1=MARKET; 2=GOVERNANCE; 3=CAPABILITY; 0=none`. Chota then warns before saving if V9 names a framing that wasn't coded Yes, or is 0 while one was. You can fix the codes, or press `Enter` again to save anyway. Articles saved anyway carry the warning in a `check_flags` column. On import, Chota sets this up from lines like "V9 must be one of the framings coded 1 in V6 to V8".

### Measure

Each question has a Measure (Nominal, Ordinal or Scale). It is written into the SPSS file and decides which alpha is used.

### Exclusion reasons

When an article is excluded, by the Exclude button or by a rule such as "V3 = 0, end coding and exclude", Chota asks for the reason. Edit the list of reasons on the Codebook screen. Reasons are exported in `exclude_reason`.

### Sharing and versions

**Download codebook** saves the codebook as a file that other coders open with **Import a codebook…**. A locked copy can't be edited until someone unlocks it. Each coded article records the codebook version it was coded with (`codebook_version` in the export), and the Codebook screen warns when some articles were coded under an earlier version.

### Pasting a codebook

You can also paste a codebook, one question per line:

```
name | question | type | coding rule | skip rules
eligible | Is AI a substantive subject? | binary | Two or more sentences on AI | skip: 0=exclude
press | Based on a press release? | single: 0=No; 1=Yes; 98=Cannot determine
actor | Who is the main actor? | text: 0=No main actor | | skip: 0=notes
notes | Notes | text
```

## Export

The SPSS, Excel, CSV and R/Python exports contain, for each coded article:

- the article details
- every question
- `coder`, `exclude_reason`, `check_flags`, `codebook_version`, the date coded and the seconds spent
- the sampling log's columns, if one is loaded

Tick **Start variable names with question numbers** to get names such as `V3_ELIGIBLE`.

`binary` exports as 1 = Yes and 0 = No. In skip rules, `exclude` ends coding and excludes the article, `end` just ends coding, and a variable name skips to that question. A question left unanswered exports as missing.

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

## License

Chota is released under the [Functional Source License, Version 1.1, ALv2 Future License](LICENSE.md) (FSL-1.1-ALv2). You may use, study, change and share it for any purpose except offering a competing product or service. Each version becomes available under the Apache License 2.0 two years after its release.

Copyright 2026 Amaka Peace Onebunne.
