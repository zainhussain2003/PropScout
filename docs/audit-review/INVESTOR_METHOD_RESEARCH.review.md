# Review — `INVESTOR_METHOD_RESEARCH.md`

**Verdict: the most rigorous document in the repository. Its quantitative core
reproduces to the dollar. Four analytical caveats and one unstated product
consequence.**

This document has grown from 405 to 453 lines since I first reviewed it on
2026-09-10 (the earlier review is preserved below in substance). The additions
appear to be reviewer-feedback integration; the core analysis is unchanged.

## Independent reproduction

I recomputed the illustration tables from scratch using Canadian semi-annual
compounding — $729,900, 20% down, 4.79%, 25-year amortisation, $13,473
acquisition costs, 5% selling cost.

| Figure           |           Document |       My recomputation |
| ---------------- | -----------------: | ---------------------: |
| Mortgage payment |            ~$3,327 |          **$3,326.64** |
| Year-1 principal |           ~$12,494 |            **$12,494** |
| 5y / 0%          |  −$41,139 · −4.76% |  **−$41,139 · −4.76%** |
| 5y / 2%          |   +$31,031 · 3.10% |   **+$31,031 · 3.10%** |
| 5y / 3%          |   +$69,302 · 6.50% |   **+$69,302 · 6.50%** |
| 5y / 5%          | +$150,436 · 12.58% | **+$150,436 · 12.58%** |
| 10y / 0%         |  −$13,931 · −0.65% |  **−$13,931 · −0.65%** |
| 10y / 2%         |  +$137,921 · 5.10% |  **+$137,921 · 5.10%** |
| 10y / 3%         |  +$224,542 · 7.50% |  **+$224,542 · 7.50%** |
| 10y / 5%         | +$422,148 · 11.72% | **+$422,148 · 11.72%** |

The Buttermill-scale table ($2,724/mo shortfall) also reproduces exactly:
5y/3% −$34,138 (−3.00%), 5y/5% +$46,996 (3.68%), 10y/3% +$17,662 (0.54%),
10y/5% +$215,268 (5.46%).

**All twelve rows, the payment and the principal figure match to the dollar and
to two decimal places on IRR.** I know of no other document in this project whose
numbers survive that test.

**No double-counting of principal.** I checked this specifically because it is
the classic error in leveraged hold analysis. Principal leaves as part of the
monthly shortfall and returns as a reduced payoff balance at sale; it is counted
once, in the right direction. The treatment is correct.

## The central judgement is right

**Appreciation must never feed the income score.** This is the most important
sentence in the document and it is correct. Combined with the refusal to loosen
the score, it is what stops the product becoming an advert. The three-way split —
income fundamentals / hold-case return / evidence confidence — is the standard
institutional separation (property-level, equity-level, data quality) and it
solves the real problem: one number is being asked to carry three orthogonal
judgements.

The proposed top-line verdict — _"Fails as an income property. Appreciation-led
hold only. Low evidence confidence."_ — is genuinely better than a number.

## Four analytical caveats

### 1. Two omissions bias in opposite directions, and the document treats them as neutral

It lists what is excluded ("tax, capital work, rent growth, refinancing and rate
changes") but never says which way each cuts.

- Holding the shortfall **flat** for ten years while compounding the price at
  3–5% is internally inconsistent. If prices grow, rents generally grow too.
  This **understates** the appreciation cases.
- The 10-year rows assume **4.79% for a decade**. No Canadian borrower holds a
  five-year term for ten years. This **overstates** them, and it is the larger
  effect.

This matters because the document leans on the 10-year 3% Buttermill row
(+$17,662, IRR 0.54%) to argue 3% growth "barely rescues" the case. That is the
thinnest number in the document and it is carrying an argument. A renewal-shock
row would likely break it; a rent-growth row would likely save it. Both belong
in the table.

### 2. "Default the hold-case comparison to 0% rather than 3%" frames a stress case as neutral

0% nominal over ten years implies roughly −2%/yr in real terms at target
inflation. It is a much better default than 3% and I support the change — but it
is still an assumption, and the document's own rule 3 says _label every rate_.
Call it "flat nominal — stress case", not the baseline comparison.

### 3. "Reduce duplicated rewards from four highly correlated metrics" is right here and wrong in general

Cap rate is unlevered; cash flow, CoC and DSCR are levered. They collapse
together _because financing is one user-chosen scenario_. An implementer who
reads "correlated" as "redundant" and merges them will delete the leverage
dimension — which this document's own hold-case engine depends on. The fix is
decorrelation (cap rate for the asset, DSCR for the financing, demote CoC), not
fewer points.

### 4. The 5% row deserves the scepticism the document reserves for forecasts

The document cites the Bank of Canada on extrapolative expectations and states
"never call historical appreciation a forecast" — good. But 5% nominal for ten
years embeds a specific rate regime. Listing it beside 0/2/3% without noting that
gives it unearned parity.

## The unstated product consequence

The evidence-confidence ceiling table is coherent, but for an **address-entered**
listing rent is always estimated and expenses are always estimated. Under the
table that is "Low" at best, whose ceiling is _"Caution / appreciation-dependent"_.

**So the product could never say "good deal" through the primary input path built
in D-020.** That may well be the honest answer — but it is a major product
decision sitting inside a table, and the owner should approve it explicitly
rather than inherit it. The provenance audit reaches the same conclusion
independently ("For address-entered sale listings, low confidence will be common
... That is a truthful product outcome and should be designed intentionally"),
which strengthens the case that it is real and should be surfaced.

## Integration gaps

1. **`ModeModal` is never mentioned.** The product already asks investment vs
   personal use. Adding "What is your main plan for this property?" makes two
   sequential questions before an answer, cutting against D-021's deliberate
   two-field minimalism. Defensible — one tap that changes the conclusion earns
   its place — but it needs to be an explicit decision.
2. **The rename has more blast radius than implementation step 2 admits.** "Deal
   score" appears in spec §10, the `score_version` column, the PDF, share links
   and the landing showcase. Step 2 ("Relabel the present score as Income
   fundamentals and expose its complete breakdown") reads like a copy change.
3. **No sizing.** Ten implementation steps, no effort estimates, and step 5 (a
   deterministic pre-tax hold-case calculator with IRR, NPV, equity multiple and
   break-even appreciation) is a substantial piece of work sitting between
   cheaper items.

## External sources — not verified

Fourteen citations, all plausible institutional ones (CMHC, OSFI, RICS, CRA,
FCAC, MSCI, Bank of Canada, Statistics Canada). **I did not fetch any of them.**
Two are load-bearing and should be checked before they drive code:

- **CMHC Hamilton CMA 3.6% and condominium apartment 1.2%** — used to declare the
  current 3.3% constant inadequate.
- **Source 14** (Bank of Canada "Financial stability indicators", a live
  indicators page) is a loose citation for the specific claim that survey
  expectations diverge substantially from published price-index growth.

## Bottom line

Accept the method. Its arithmetic is verified, its central judgement on
appreciation is right, and its architecture is correct. Before implementation:
add rent-growth and renewal-shock rows so the omissions' directions are visible;
relabel 0% as a stress case rather than the baseline; qualify the correlation
finding so it is not implemented as redundancy; and put the address-entry
confidence ceiling in front of the owner as an explicit decision.
