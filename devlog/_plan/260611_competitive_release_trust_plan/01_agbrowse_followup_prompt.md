# 01 Agbrowse Follow-Up Prompt

This prompt corrects the earlier external evaluation framing.

```text
[SYSTEM]
You are a senior open-source product/architecture reviewer. Continue the same
evaluation of code-office, but correct the competitive frame. Be blunt and
practical. Answer in Korean.

[USER]
## Repository
GitHub: https://github.com/lidge-jun/code-office
Homepage: https://lidge-jun.github.io/code-office/
VS Marketplace: https://marketplace.visualstudio.com/items?itemName=jun6161.code-office
Open VSX: https://open-vsx.org/extension/lidge-jun/code-office

## Correction to your previous framing
Your previous evaluation compared code-office too strongly against generic
Office Viewer adoption and Obsidian. Please reassess with these premises:

1. There is no truly strong, maintained, local-first WYSIWYG document editor
   inside VS Code that covers this workflow.
2. There is no comparable local HWP/HWPX editor extension with VS Code native
   dirty/save lifecycle coverage.
3. The original upstream office-viewer repository has high historical adoption,
   but it effectively stopped moving years ago. Adoption should not be confused
   with active product momentum.
4. code-office is only now beginning serious public distribution. Current
   Marketplace/Open VSX install counts are an early baseline, not mature demand
   evidence.
5. code-office is not trying to beat Obsidian as a PKM app. Markdown matters
   because it keeps notes, citations, and drafts inside the same VS Code
   workspace as DOCX, HWP/HWPX, PPTX, PDF, and source/evidence files.
6. The product meaning is "make document-heavy work possible inside VS Code,"
   not "be a standalone office suite" and not "replace Obsidian."

## Ask
Please reassess in more detail:

1. If the strategic wedge is local HWP/HWPX editing plus cross-format document
   review inside VS Code, how competitive is code-office?
2. How much does upstream staleness change the competitive analysis?
3. How strong is the WYSIWYG gap in VS Code, and what quality bar must
   code-office hit to own it?
4. What release-trust work is necessary before broader public distribution?
   Include GitHub Releases, checksums, artifact provenance, compatibility matrix,
   and CI/CD publish automation.
5. What would make this project credible even before install counts grow?
6. What are the top 7 concrete next actions, in order?
7. Re-score repo maturity, product competitiveness, strategic moat, and
   open-source credibility under this corrected frame.

Constraints:
- Distinguish public evidence from inference.
- Include source URLs used.
- Do not flatter. Give a serious investor/maintainer-style critique.
```
