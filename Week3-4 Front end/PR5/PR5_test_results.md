[1m[7m[36m RUN [39m[27m[22m [36mv2.1.9 [39m[90mC:/Users/zain0/OneDrive/Desktop/PropScout/apps/web[39m

[32m✓[39m src/constants/tiers.test.ts[2m > [22mtiers[2m > [22mfree tier narrative is shorter than pro
[32m✓[39m src/constants/tiers.test.ts[2m > [22mtiers[2m > [22mfree tier is priced at zero
[32m✓[39m src/constants/tiers.test.ts[2m > [22mtiers[2m > [22mtier prices increase with tier level
[32m✓[39m src/constants/thresholds.test.ts[2m > [22mthresholds[2m > [22mdeal score brackets are in ascending order
[32m✓[39m src/constants/thresholds.test.ts[2m > [22mthresholds[2m > [22mred flag confidence is above amber
[32m✓[39m src/lib/validateUrl.test.ts[2m > [22mvalidateUrl[2m > [22mreturns error for empty string
[32m✓[39m src/lib/validateUrl.test.ts[2m > [22mvalidateUrl[2m > [22mreturns error for whitespace-only input
[32m✓[39m src/lib/validateUrl.test.ts[2m > [22mvalidateUrl[2m > [22mreturns error when no http/https scheme
[32m✓[39m src/lib/validateUrl.test.ts[2m > [22mvalidateUrl[2m > [22maccepts http:// as a valid scheme
[32m✓[39m src/lib/validateUrl.test.ts[2m > [22mvalidateUrl[2m > [22maccepts https:// as a valid scheme
[32m✓[39m src/lib/validateUrl.test.ts[2m > [22mvalidateUrl[2m > [22mreturns "not supported" for an unrecognised listing site
[32m✓[39m src/lib/validateUrl.test.ts[2m > [22mvalidateUrl[2m > [22mreturns "not supported" for a random URL
[32m✓[39m src/lib/validateUrl.test.ts[2m > [22mvalidateUrl[2m > [22mblocks zillow.com US links
[32m✓[39m src/lib/validateUrl.test.ts[2m > [22mvalidateUrl[2m > [22mdoes NOT block zillow.ca links
[32m✓[39m src/lib/validateUrl.test.ts[2m > [22mvalidateUrl[2m > [22maccepts a realtor.ca for-sale URL
[32m✓[39m src/lib/validateUrl.test.ts[2m > [22mvalidateUrl[2m > [22maccepts a realtor.ca rental URL
[32m✓[39m src/lib/validateUrl.test.ts[2m > [22mvalidateUrl[2m > [22maccepts a zillow.ca URL
[32m✓[39m src/lib/validateUrl.test.ts[2m > [22mvalidateUrl[2m > [22mis case-insensitive for the domain
[32m✓[39m src/lib/validateUrl.test.ts[2m > [22mvalidateUrl[2m > [22mtrims leading and trailing whitespace before validating
[32m✓[39m src/lib/validateUrl.test.ts[2m > [22mdetectListingKind[2m > [22mreturns "sale" for a plain realtor.ca URL
[32m✓[39m src/lib/validateUrl.test.ts[2m > [22mdetectListingKind[2m > [22mreturns "rent" for a URL with /for-rent/
[32m✓[39m src/lib/validateUrl.test.ts[2m > [22mdetectListingKind[2m > [22mreturns "rent" for a URL with /rental/
[32m✓[39m src/lib/validateUrl.test.ts[2m > [22mdetectListingKind[2m > [22mreturns "rent" for a URL with /apartments-for-rent/
[32m✓[39m src/lib/validateUrl.test.ts[2m > [22mdetectListingKind[2m > [22mdefaults to "sale" for an unrecognised URL pattern
[32m✓[39m src/lib/validateUrl.test.ts[2m > [22mdetectListingKind[2m > [22mis case-insensitive
[32m✓[39m src/lib/services/analysisService.test.ts[2m > [22mrunAnalysis[2m > [22mreturns Analysis object on 200
[32m✓[39m src/lib/services/analysisService.test.ts[2m > [22mrunAnalysis[2m > [22mconverts camelCase to snake_case in request body
[32m✓[39m src/lib/services/analysisService.test.ts[2m > [22mrunAnalysis[2m > [22msends request to /analysis/ endpoint
[32m✓[39m src/lib/services/analysisService.test.ts[2m > [22mrunAnalysis[2m > [22mthrows ApiRequestError with code on 422
[32m✓[39m src/lib/services/analysisService.test.ts[2m > [22mrunAnalysis[2m > [22mthrows ApiRequestError on network failure
[32m✓[39m src/lib/services/analysisService.test.ts[2m > [22mrunAnalysis[2m > [22mdefaults province to ON when not provided
[32m✓[39m src/lib/services/analysisService.test.ts[2m > [22mrunAnalysis[2m > [22mdefaults include_management_fee to false when not provided
[32m✓[39m src/lib/services/analysisService.test.ts[2m > [22mApiRequestError[2m > [22mis an instance of Error
[32m✓[39m src/lib/services/analysisService.test.ts[2m > [22mApiRequestError[2m > [22mexposes code, message, and status
[32m✓[39m src/lib/services/analysisService.test.ts[2m > [22mApiRequestError[2m > [22mhas name ApiRequestError
[32m✓[39m src/hooks/useAnalysis.test.ts[2m > [22museAnalysis[2m > [22mstarts with null analysis, false loading, null error
[32m✓[39m src/hooks/useAnalysis.test.ts[2m > [22museAnalysis[2m > [22msets loading true during run, then false after
[32m✓[39m src/hooks/useAnalysis.test.ts[2m > [22museAnalysis[2m > [22msets analysis on success
[32m✓[39m src/hooks/useAnalysis.test.ts[2m > [22museAnalysis[2m > [22msets error string on ApiRequestError
[32m✓[39m src/hooks/useAnalysis.test.ts[2m > [22museAnalysis[2m > [22msets generic error string on unknown error
[32m✓[39m src/hooks/useAnalysis.test.ts[2m > [22museAnalysis[2m > [22mresets state before each run — analysis is null after second run fails
[32m✓[39m src/hooks/useAnalysis.test.ts[2m > [22museAnalysis[2m > [22mloading is false on error
[32m✓[39m ../../Week3-4 Front end/PR5/ListedVsRealitySection.test.tsx[2m > [22mListedVsRealitySection[2m > [22mreturns null (renders nothing) when mismatchCount === 0
[32m✓[39m ../../Week3-4 Front end/PR5/ListedVsRealitySection.test.tsx[2m > [22mListedVsRealitySection[2m > [22mrenders both the "How it's listed" and "What you'll actually get" cards when mismatches exist
[32m✓[39m ../../Week3-4 Front end/PR5/ListedVsRealitySection.test.tsx[2m > [22mListedVsRealitySection[2m > [22mrenders the original listing text in the left card
[32m✓[39m ../../Week3-4 Front end/PR5/ListedVsRealitySection.test.tsx[2m > [22mListedVsRealitySection[2m > [22mrenders the corrected reality descriptions in the right card
[32m✓[39m ../../Week3-4 Front end/PR5/ListedVsRealitySection.test.tsx[2m > [22mListedVsRealitySection[2m > [22mrenders ✓ glyphs for ok-tone reality items
[32m✓[39m ../../Week3-4 Front end/PR5/ListedVsRealitySection.test.tsx[2m > [22mListedVsRealitySection[2m > [22mrenders ✗ glyphs for bad-tone reality items
[32m✓[39m ../../Week3-4 Front end/PR5/ListedVsRealitySection.test.tsx[2m > [22mListedVsRealitySection[2m > [22mshows the correct mismatch count label in the section verdict
[32m✓[39m ../../Week3-4 Front end/PR5/ListedVsRealitySection.test.tsx[2m > [22mListedVsRealitySection[2m > [22muses singular "mismatch" when mismatchCount === 1
[32m✓[39m ../../Week3-4 Front end/PR5/WhatsIncludedSection.test.tsx[2m > [22mWhatsIncludedSection[2m > [22mrenders ✓ glyph for an incl amenity
[32m✓[39m ../../Week3-4 Front end/PR5/WhatsIncludedSection.test.tsx[2m > [22mWhatsIncludedSection[2m > [22mrenders $ glyph for an extra amenity
[32m✓[39m ../../Week3-4 Front end/PR5/WhatsIncludedSection.test.tsx[2m > [22mWhatsIncludedSection[2m > [22mrenders ? glyph for an unclear amenity
[32m✓[39m ../../Week3-4 Front end/PR5/WhatsIncludedSection.test.tsx[2m > [22mWhatsIncludedSection[2m > [22mrenders the legend with "Included", "Extra", and "Unclear" labels
[32m✓[39m ../../Week3-4 Front end/PR5/WhatsIncludedSection.test.tsx[2m > [22mWhatsIncludedSection[2m > [22mshows the amenity note when provided
[32m✓[39m ../../Week3-4 Front end/PR5/WhatsIncludedSection.test.tsx[2m > [22mWhatsIncludedSection[2m > [22mrenders all amenity labels in the grid
[32m✓[39m ../../Week3-4 Front end/PR5/WhatsIncludedSection.test.tsx[2m > [22mWhatsIncludedSection[2m > [22mshows a confirmed count in the summary line
[32m✓[39m ../../Week3-4 Front end/PR5/TenantSchoolsSection.test.tsx[2m > [22mTenantSchoolsSection[2m > [22mrenders the three column headers: Elementary, Middle, and High school
[32m✓[39m ../../Week3-4 Front end/PR5/TenantSchoolsSection.test.tsx[2m > [22mTenantSchoolsSection[2m > [22mrenders the "In catchment" badge only on schools with inCatchment=true
[32m✓[39m ../../Week3-4 Front end/PR5/TenantSchoolsSection.test.tsx[2m > [22mTenantSchoolsSection[2m > [22mshows "Above avg" quality label for quality="above" schools
[32m✓[39m ../../Week3-4 Front end/PR5/TenantSchoolsSection.test.tsx[2m > [22mTenantSchoolsSection[2m > [22mshows "Average" quality label for quality="avg" schools
[32m✓[39m ../../Week3-4 Front end/PR5/TenantSchoolsSection.test.tsx[2m > [22mTenantSchoolsSection[2m > [22momits a column entirely when no schools exist for that level
[32m✓[39m ../../Week3-4 Front end/PR5/TenantSchoolsSection.test.tsx[2m > [22mTenantSchoolsSection[2m > [22mrenders all school names from CHARLES_SCHOOLS
[32m✓[39m ../../Week3-4 Front end/PR5/TenantSchoolsSection.test.tsx[2m > [22mTenantSchoolsSection[2m > [22mrenders the board glyph letters P, C, F for the three board types
[32m✓[39m ../../Week3-4 Front end/PR5/TenantSchoolsSection.test.tsx[2m > [22mTenantSchoolsSection[2m > [22mrenders distance and walk time on each school card
[32m✓[39m ../../Week3-4 Front end/PR5/LocationCommuteSection.test.tsx[2m > [22mLocationCommuteSection[2m > [22mrenders the Walk Score value with correct aria-label
[32m✓[39m ../../Week3-4 Front end/PR5/LocationCommuteSection.test.tsx[2m > [22mLocationCommuteSection[2m > [22mrenders the Transit Score value with correct aria-label
[32m✓[39m ../../Week3-4 Front end/PR5/LocationCommuteSection.test.tsx[2m > [22mLocationCommuteSection[2m > [22mrenders the Bike Score value with correct aria-label
[32m✓[39m ../../Week3-4 Front end/PR5/LocationCommuteSection.test.tsx[2m > [22mLocationCommuteSection[2m > [22mrenders all distance row keys in the right-hand table
[32m✓[39m ../../Week3-4 Front end/PR5/LocationCommuteSection.test.tsx[2m > [22mLocationCommuteSection[2m > [22mshows the "From this address" heading in the distances card
[32m✓[39m ../../Week3-4 Front end/PR5/LocationCommuteSection.test.tsx[2m > [22mLocationCommuteSection[2m > [22mrenders the "Mobility scores" heading in the left card
[32m✓[39m ../../Week3-4 Front end/PR5/LocationCommuteSection.test.tsx[2m > [22mLocationCommuteSection[2m > [22mrenders the score sub-descriptions from the data
[32m✓[39m ../../Week3-4 Front end/PR5/FlagDeepRow.test.tsx[2m > [22mFlagDeepRow[2m > [22mrenders the "!" glyph for a red-tone flag
[32m✓[39m ../../Week3-4 Front end/PR5/FlagDeepRow.test.tsx[2m > [22mFlagDeepRow[2m > [22mrenders the "?" glyph for an amber-tone flag
[32m✓[39m ../../Week3-4 Front end/PR5/FlagDeepRow.test.tsx[2m > [22mFlagDeepRow[2m > [22mrenders the "✓" glyph for a good-tone flag
[32m✓[39m ../../Week3-4 Front end/PR5/FlagDeepRow.test.tsx[2m > [22mFlagDeepRow[2m > [22mrenders the flag label in the collapsed header
[32m✓[39m ../../Week3-4 Front end/PR5/FlagDeepRow.test.tsx[2m > [22mFlagDeepRow[2m > [22mis collapsed by default — evidence and ask text are not visible
[32m✓[39m ../../Week3-4 Front end/PR5/FlagDeepRow.test.tsx[2m > [22mFlagDeepRow[2m > [22mexpands on click — evidence quote and "Ask before signing" box become visible
[32m✓[39m ../../Week3-4 Front end/PR5/FlagDeepRow.test.tsx[2m > [22mFlagDeepRow[2m > [22mcollapses again on second click — evidence is hidden
[32m✓[39m ../../Week3-4 Front end/PR5/NegotiationSection.test.tsx[2m > [22mNegotiationSection[2m > [22mrenders all leverage factor keys in the table
[32m✓[39m ../../Week3-4 Front end/PR5/NegotiationSection.test.tsx[2m > [22mNegotiationSection[2m > [22mrenders all leverage factor values in the table
[32m✓[39m ../../Week3-4 Front end/PR5/NegotiationSection.test.tsx[2m > [22mNegotiationSection[2m > [22mrenders the copy button with the correct aria-label in default state
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mDealScore[2m > [22mrenders the clamped score as a visible number
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mDealScore[2m > [22mclamps scores above 95 to 95
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mDealScore[2m > [22mclamps negative scores to 0
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mDealScore[2m > [22mhas a descriptive aria-label with score and max
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mDealScore[2m > [22mrenders the optional label text when provided
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mDealScore[2m > [22mrenders verdict text when showVerdict=true and score ≤ 25
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mDealScore[2m > [22mrenders "Strong deal" verdict text when showVerdict=true and score > 80
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mDealScore[2m > [22mrenders "Good deal" verdict text for score 65–80
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mDealScore[2m > [22mrenders sm size (84px viewBox)
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mDealScore[2m > [22mrenders lg size (180px viewBox)
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mDealScore[2m > [22mSVG has aria-hidden="true" (outer wrapper div carries the label)
[32m✓[39m ../../Week3-4 Front end/PR5/NegotiationSection.test.tsx[2m > [22mNegotiationSection[2m > [22mclicking copy calls navigator.clipboard.writeText with the suggested message
[32m✓[39m ../../Week3-4 Front end/PR5/NegotiationSection.test.tsx[2m > [22mNegotiationSection[2m > [22mshows "Message copied to clipboard" aria-label after copy and reverts after 2 seconds
[32m✓[39m ../../Week3-4 Front end/PR5/NegotiationSection.test.tsx[2m > [22mNegotiationSection[2m > [22mrenders all "Why this works" reason bullets
[32m✓[39m ../../Week3-4 Front end/PR5/NegotiationSection.test.tsx[2m > [22mNegotiationSection[2m > [22mrenders the target rent range in the leverage card
[32m✓[39m ../../Week3-4 Front end/PR5/NegotiationSection.test.tsx[2m > [22mNegotiationSection[2m > [22mrenders the annual savings estimate
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mDealScore[2m > [22mhas no axe accessibility violations
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mDealScore[2m > [22mmatches snapshot
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mMetric[2m > [22mrenders label, value, and sub text
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mMetric[2m > [22mrenders without sub text when sub is omitted
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mMetric[2m > [22mapplies fail colour variable for status=fail
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mMetric[2m > [22mapplies pass colour variable for status=pass
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mMetric[2m > [22mapplies neutral colour (var(--ink)) by default
[32m✓[39m src/components/shared/shared.test.tsx[2m > [22mScoutMark[2m > [22mrenders an SVG with aria-hidden
[32m✓[39m src/components/shared/shared.test.tsx[2m > [22mScoutMark[2m > [22mapplies the size prop to width and height
[32m✓[39m src/components/shared/shared.test.tsx[2m > [22mScoutMark[2m > [22mdefaults to size 28 when no prop is passed
[32m✓[39m src/components/shared/shared.test.tsx[2m > [22mWordmark[2m > [22mrenders "Prop" and "Scout" text
[32m✓[39m src/components/shared/shared.test.tsx[2m > [22mWordmark[2m > [22mrenders a ScoutMark SVG inside
[32m✓[39m src/components/shared/shared.test.tsx[2m > [22mWordmark[2m > [22mapplies height prop to the wrapper
[32m✓[39m src/components/shared/shared.test.tsx[2m > [22mIcon[2m > [22mrenders an SVG with aria-hidden for every icon name
[32m✓[39m src/components/shared/shared.test.tsx[2m > [22mIcon[2m > [22mapplies the size prop
[32m✓[39m src/components/shared/shared.test.tsx[2m > [22mIcon[2m > [22mdefaults to size 16
[32m✓[39m src/components/shared/shared.test.tsx[2m > [22mChip[2m > [22mrenders children text
[32m✓[39m src/components/shared/shared.test.tsx[2m > [22mChip[2m > [22mapplies the .chip class
[32m✓[39m src/components/shared/shared.test.tsx[2m > [22mChip[2m > [22mdoes not render the accent dot by default
[32m✓[39m src/components/shared/shared.test.tsx[2m > [22mChip[2m > [22mrenders the accent dot when accent prop is true
[32m✓[39m src/components/shared/shared.test.tsx[2m > [22mButton[2m > [22mrenders children
[32m✓[39m src/components/shared/shared.test.tsx[2m > [22mButton[2m > [22mapplies btn-primary class by default
[32m✓[39m src/components/shared/shared.test.tsx[2m > [22mButton[2m > [22mapplies btn-ghost class for ghost variant
[32m✓[39m src/components/shared/shared.test.tsx[2m > [22mButton[2m > [22mapplies btn-accent class for accent variant
[32m✓[39m src/components/shared/shared.test.tsx[2m > [22mButton[2m > [22mcalls onClick when clicked
[32m✓[39m src/components/shared/shared.test.tsx[2m > [22mButton[2m > [22mis disabled when disabled prop is set
[32m✓[39m src/components/shared/shared.test.tsx[2m > [22mCard[2m > [22mrenders children inside a .card div
[32m✓[39m src/components/shared/shared.test.tsx[2m > [22mCard[2m > [22mpasses additional className through
[32m✓[39m src/components/shared/shared.test.tsx[2m > [22mCard[2m > [22mpasses style through
[32m✓[39m src/components/shared/shared.test.tsx[2m > [22mVerdictPill[2m > [22mrenders the label text
[32m✓[39m src/components/shared/shared.test.tsx[2m > [22mVerdictPill[2m > [22mapplies .verdict-pill and tone class
[32m✓[39m src/components/shared/shared.test.tsx[2m > [22mVerdictPill[2m > [22mapplies fail class for fail tone
[32m✓[39m src/components/shared/shared.test.tsx[2m > [22mVerdictPill[2m > [22mdoes not contain any raw hex color strings
[32m✓[39m src/components/shared/shared.test.tsx[2m > [22mSectionHead[2m > [22mrenders the section number
[32m✓[39m src/components/shared/shared.test.tsx[2m > [22mSectionHead[2m > [22mrenders the topic label
[32m✓[39m src/components/shared/shared.test.tsx[2m > [22mSectionHead[2m > [22mrenders the question in an h2
[32m✓[39m src/components/shared/shared.test.tsx[2m > [22mSectionHead[2m > [22mdoes not render a VerdictPill when verdict is not provided
[32m✓[39m src/components/shared/shared.test.tsx[2m > [22mSectionHead[2m > [22mrenders a VerdictPill when verdict is provided
[32m✓[39m src/components/shared/shared.test.tsx[2m > [22mFooter[2m > [22mrenders the legal disclaimer
[32m✓[39m src/components/shared/shared.test.tsx[2m > [22mFooter[2m > [22mrenders the copyright line
[32m✓[39m src/components/shared/shared.test.tsx[2m > [22mFooter[2m > [22mrenders key footer link labels
[32m✓[39m src/components/shared/shared.test.tsx[2m > [22mFooter[2m > [22mrenders the Wordmark inside footer
[32m✓[39m src/components/shared/shared.test.tsx[2m > [22mSignInModal[2m > [22mrenders nothing when open is false
[32m✓[39m src/components/shared/shared.test.tsx[2m > [22mSignInModal[2m > [22mrenders the modal when open is true
[32m✓[39m src/components/shared/shared.test.tsx[2m > [22mSignInModal[2m > [22mcalls onClose when the backdrop is clicked
[32m✓[39m src/components/shared/shared.test.tsx[2m > [22mSignInModal[2m > [22mcalls onClose when Escape is pressed
[32m✓[39m src/components/shared/shared.test.tsx[2m > [22mSignInModal[2m > [22mshows sign-in headline by default
[32m✓[39m src/components/shared/shared.test.tsx[2m > [22mSignInModal[2m > [22mswitches to sign-up mode when "Create a free account" link is clicked
[32m✓[39m src/components/shared/shared.test.tsx[2m > [22mSignInModal[2m > [22mhas an email input
[32m✓[39m src/components/shared/shared.test.tsx[2m > [22mSignInModal[2m > [22mdoes not propagate clicks inside the modal card to the backdrop
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mMetric[2m > [22mhas no axe accessibility violations
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mMetric[2m > [22mmatches snapshot
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mRentalCompsBar[2m > [22mhas role="region" with a descriptive aria-label
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mRentalCompsBar[2m > [22mrenders low, mid, and high dollar labels
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mRentalCompsBar[2m > [22mdiamond marker has aria-label with the estimate value
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mRentalCompsBar[2m > [22mshows "above comp range" warning when ask > high
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mRentalCompsBar[2m > [22mshows "below comp range" warning when ask < low
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mRentalCompsBar[2m > [22mshows hover tooltip when diamond is moused over
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mRentalCompsBar[2m > [22mhides tooltip after mouse leave
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mRentalCompsBar[2m > [22mhas no axe accessibility violations
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mRentalCompsBar[2m > [22mmatches snapshot
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mAIVerdictBlock[2m > [22mrenders the eyebrow text
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mAIVerdictBlock[2m > [22mrenders the headline
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mAIVerdictBlock[2m > [22mrenders the sub paragraph
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mAIVerdictBlock[2m > [22mrenders JSX headline nodes
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mAIVerdictBlock[2m > [22mScoutMark watermark has aria-hidden="true"
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mAIVerdictBlock[2m > [22mmodel tag "claude · sonnet 4.6" is always rendered
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mAIVerdictBlock[2m > [22mmatches snapshot
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mRiskRow[2m > [22mrenders the flag label
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mRiskRow[2m > [22mrenders the detail text
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mRiskRow[2m > [22mleft bar uses var(--fail) for tone="red"
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mRiskRow[2m > [22mleft bar uses var(--caution) for tone="amber"
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mRiskRow[2m > [22mleft bar uses var(--pass) for tone="green"
[32m✓[39m src/components/shared/shared.test.tsx[2m > [22mSignInModal[2m > [22mmoves focus inside the modal on open
[32m✓[39m src/components/shared/shared.test.tsx[2m > [22mSignInModal[2m > [22mtraps Tab at the last focusable element
[32m✓[39m src/components/shared/shared.test.tsx[2m > [22mSignInModal[2m > [22mtraps Shift+Tab at the first focusable element
[32m✓[39m src/components/shared/ModeModal.test.tsx[2m > [22mModeModal[2m > [22mrenders nothing when open is false
[32m✓[39m src/components/shared/ModeModal.test.tsx[2m > [22mModeModal[2m > [22mrenders the modal when open is true
[32m✓[39m src/components/shared/ModeModal.test.tsx[2m > [22mModeModal[2m > [22mshows listing address when listing prop is provided
[32m✓[39m src/components/shared/ModeModal.test.tsx[2m > [22mModeModal[2m > [22mshows "for sale" label for sale listing
[32m✓[39m src/components/shared/ModeModal.test.tsx[2m > [22mModeModal[2m > [22mshows "for rent" label for rent listing
[32m✓[39m src/components/shared/ModeModal.test.tsx[2m > [22mModeModal[2m > [22mrenders without a listing preview when listing is null
[32m✓[39m src/components/shared/ModeModal.test.tsx[2m > [22mModeModal[2m > [22mshows investment-vs-personal question for for-sale listing
[32m✓[39m src/components/shared/ModeModal.test.tsx[2m > [22mModeModal[2m > [22mshows tenant-vs-landlord question for for-rent listing
[32m✓[39m src/components/shared/ModeModal.test.tsx[2m > [22mModeModal[2m > [22mshows "Free forever" pill on the tenant card for rent listings
[32m✓[39m src/components/shared/ModeModal.test.tsx[2m > [22mModeModal[2m > [22mdoes NOT show "Free forever" for sale listings
[32m✓[39m src/components/shared/ModeModal.test.tsx[2m > [22mModeModal[2m > [22mshows both choice cards for a sale listing
[32m✓[39m src/components/shared/ModeModal.test.tsx[2m > [22mModeModal[2m > [22mshows both choice cards for a rent listing
[32m✓[39m src/components/shared/ModeModal.test.tsx[2m > [22mModeModal[2m > [22mcalls onClose when the × button is clicked
[32m✓[39m src/components/shared/ModeModal.test.tsx[2m > [22mModeModal[2m > [22mcalls onClose when Escape key is pressed
[32m✓[39m src/components/shared/ModeModal.test.tsx[2m > [22mModeModal[2m > [22mcalls onClose when the backdrop overlay is clicked
[32m✓[39m src/components/shared/ModeModal.test.tsx[2m > [22mModeModal[2m > [22mdoes NOT call onClose when clicking inside the card
[32m✓[39m src/components/shared/ModeModal.test.tsx[2m > [22mModeModal[2m > [22mtoggles the "why we ask" explanation on click
[32m✓[39m src/components/shared/ModeModal.test.tsx[2m > [22mModeModal[2m > [22mhas role="dialog" and aria-modal="true"
[32m✓[39m src/components/shared/ModeModal.test.tsx[2m > [22mModeModal[2m > [22mhas an accessible label on the close button
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mRiskRow[2m > [22mhas no axe accessibility violations
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mRiskRow[2m > [22mmatches snapshot
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mMiniMap[2m > [22mhas role="img" for the map container
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mMiniMap[2m > [22maria-label includes the property address
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mMiniMap[2m > [22maccepts custom height prop without error
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mMiniMap[2m > [22maccepts pins prop without error
[32m✓[39m src/components/investor/AssumptionFields.test.tsx[2m > [22mASSUMPTION_FIELDS[2m > [22mdefines all 7 expected fields
[32m✓[39m src/components/investor/AssumptionFields.test.tsx[2m > [22mASSUMPTION_FIELDS[2m > [22mevery field has a non-empty tooltip
[32m✓[39m src/components/investor/AssumptionFields.test.tsx[2m > [22mASSUMPTION_FIELDS[2m > [22mevery field has min < max
[32m✓[39m src/components/investor/AssumptionFields.test.tsx[2m > [22mASSUMPTION_FIELDS[2m > [22mevery defaultValue is within [min, max]
[32m✓[39m src/components/investor/AssumptionFields.test.tsx[2m > [22mDEFAULT_ASSUMPTIONS[2m > [22mvacancy default is 5 (= 5%)
[32m✓[39m src/components/investor/AssumptionFields.test.tsx[2m > [22mDEFAULT_ASSUMPTIONS[2m > [22minsurance default is 0.35 (= 0.35%)
[32m✓[39m src/components/investor/AssumptionFields.test.tsx[2m > [22mDEFAULT_ASSUMPTIONS[2m > [22mmanagement default is 8 (= 8%)
[32m✓[39m src/components/investor/AssumptionFields.test.tsx[2m > [22mDEFAULT_ASSUMPTIONS[2m > [22mappreciation default is 3 (= 3%)
[32m✓[39m src/components/investor/AssumptionFields.test.tsx[2m > [22mDEFAULT_ASSUMPTIONS[2m > [22mlegal fees default is 1500
[32m✓[39m src/components/investor/AssumptionFields.test.tsx[2m > [22mDEFAULT_ASSUMPTIONS[2m > [22mmortgage rate default is 0 (= use live rate)
[32m✓[39m src/components/investor/AssumptionFields.test.tsx[2m > [22mASSUMPTION_MAP[2m > [22mprovides O(1) lookup by key
[32m✓[39m src/components/investor/AssumptionFields.test.tsx[2m > [22mAssumptionFields[2m > [22mrenders all 7 labelled inputs
[32m✓[39m src/components/investor/AssumptionFields.test.tsx[2m > [22mAssumptionFields[2m > [22mpre-fills inputs with default values
[32m✓[39m src/components/investor/AssumptionFields.test.tsx[2m > [22mAssumptionFields[2m > [22mrenders a tooltip trigger (?) for every field
[32m✓[39m src/components/investor/AssumptionFields.test.tsx[2m > [22mAssumptionFields[2m > [22mcalls onAssumptionsChange when a value changes
[32m✓[39m src/components/investor/AssumptionFields.test.tsx[2m > [22mAssumptionFields[2m > [22maccepts initialValues overrides
[32m✓[39m src/components/investor/AssumptionFields.test.tsx[2m > [22mAssumptionFields[2m > [22mclamps values to field min on blur with an out-of-range input
[32m✓[39m src/components/investor/AssumptionFields.test.tsx[2m > [22mAssumptionFields[2m > [22mclamps values to field max on a too-high input
[32m✓[39m src/components/investor/AssumptionFields.test.tsx[2m > [22mAssumptionFields[2m > [22mdoes not call onChange if the value is not a valid number
[32m✓[39m src/components/investor/AssumptionFields.test.tsx[2m > [22mAssumptionFields[2m > [22mrenders in compact mode without error
[32m✓[39m src/components/investor/AssumptionFields.test.tsx[2m > [22mAssumptionFields[2m > [22mshows no banner when rateMetadata is not provided
[32m✓[39m src/components/investor/AssumptionFields.test.tsx[2m > [22mAssumptionFields[2m > [22mshows no banner when rateMetadata.source is live
[32m✓[39m src/components/investor/AssumptionFields.test.tsx[2m > [22mAssumptionFields[2m > [22mshows the banner when source is cached
[32m✓[39m src/components/investor/AssumptionFields.test.tsx[2m > [22mAssumptionFields[2m > [22mshows the banner when source is fallback
[32m✓[39m src/components/investor/AssumptionFields.test.tsx[2m > [22mAssumptionFields[2m > [22mpre-fills mortgageRate from rateMetadata when not in initialValues
[32m✓[39m src/components/investor/AssumptionFields.test.tsx[2m > [22mAssumptionFields[2m > [22minitialValues.mortgageRate takes precedence over rateMetadata
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mFinancingSliders[2m > [22mrenders the "Financing assumptions" heading area
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mFinancingSliders[2m > [22mrenders down payment slider with correct value (20 = 0.20 _ 100)
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mFinancingSliders[2m > [22mrenders mortgage rate slider with correct value (4.79 = 0.0479 _ 100)
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mFinancingSliders[2m > [22mrenders amortization slider with correct value (25 years)
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mFinancingSliders[2m > [22mrenders all 4 preset buttons
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mFinancingSliders[2m > [22mclicking OSFI preset calls onChange with rate=0.0679
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mFinancingSliders[2m > [22mclicking 35% down preset calls onChange with downPaymentPct=0.35
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mFinancingSliders[2m > [22mmanagement fee toggle has role="switch" with aria-checked=false
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mFinancingSliders[2m > [22mclicking management fee toggle calls onChange with includeManagementFee=true
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mFinancingSliders[2m > [22mshows the down payment dollar amount for $729,900 at 20%
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mFinancingSliders[2m > [22mhas no axe accessibility violations
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mFinancingSliders[2m > [22mmatches snapshot
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mOSFICard[2m > [22mshows the qualifying rate (max(4.79+2%, 5.25%) = 6.79%)
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mOSFICard[2m > [22mshows the contract rate
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mOSFICard[2m > [22mshows the GDS ratio
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mOSFICard[2m > [22mshows "Fails" VerdictPill when osfi.pass = false
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mOSFICard[2m > [22mshows "Qualifies" VerdictPill when osfi.pass = true
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mOSFICard[2m > [22mshows the section heading
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mOSFICard[2m > [22mshows the threshold value (44%)
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mOSFICard[2m > [22mhas no axe accessibility violations
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mOSFICard[2m > [22mmatches snapshot
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mLTTTable[2m > [22mshows the purchase price in the header
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mLTTTable[2m > [22mshows the total LTT for $729,900 = $11,073
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mLTTTable[2m > [22mrenders 4 bracket rows for a $729,900 property
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mLTTTable[2m > [22mshows "Provincial only" when toronto=false
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mLTTTable[2m > [22mshows Toronto municipal row when toronto=true
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mLTTTable[2m > [22mToronto total LTT is double the provincial for same price
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mLTTTable[2m > [22mHamilton $449,000 total LTT is computed correctly
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mMiniMap[2m > [22mhas no axe accessibility violations
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mMiniMap[2m > [22mmatches snapshot
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mPropertyHero[2m > [22mrenders the property address
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mPropertyHero[2m > [22mrenders the deal score total
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mPropertyHero[2m > [22mrenders the verdict label
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mPropertyHero[2m > [22mrenders all listing chips
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mPropertyHero[2m > [22mrenders "Analyze another listing" button
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mPropertyHero[2m > [22mcalls onBack when the "Analyze another listing" button is clicked
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mPropertyHero[2m > [22mdisplays the asking price
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mLTTTable[2m > [22mhas no axe accessibility violations
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mLTTTable[2m > [22mmatches snapshot
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mEquityChart[2m > [22mrenders the "Equity build · 20 yr horizon" heading
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mEquityChart[2m > [22mequity curve has exactly 21 data points (year 0–20)
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mEquityChart[2m > [22myear-0 equity equals down payment (property value − principal)
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mEquityChart[2m > [22myear-20 property value is higher than year-0 (3% appreciation)
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mEquityChart[2m > [22myear-20 equity is greater than year-0 equity
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mEquityChart[2m > [22mrenders the 3-milestone summary strip (year 5, 10, 20)
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mEquityChart[2m > [22mrenders nothing (empty div) when fewer than 2 data points are given
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mEquityChart[2m > [22mSVG has an accessible aria-label
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mPropertyHero[2m > [22mhas no axe accessibility violations
[32m✓[39m ../../Week3-4 Front end/PR4/analysis.test.tsx[2m > [22mPropertyHero[2m > [22mmatches snapshot
[32m✓[39m src/pages/landing.test.tsx[2m > [22mLandingPage[2m > [22mrenders without crashing[33m 428[2mms[22m[39m
[32m✓[39m src/pages/landing.test.tsx[2m > [22mLandingPage[2m > [22mrenders the Nav with "Sign in" button
[32m✓[39m src/pages/landing.test.tsx[2m > [22mLandingPage[2m > [22mrenders the hero heading
[32m✓[39m src/pages/landing.test.tsx[2m > [22mLandingPage[2m > [22mrenders the URL input with placeholder
[32m✓[39m src/pages/landing.test.tsx[2m > [22mLandingPage[2m > [22mrenders the Analyze button
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mEquityChart[2m > [22mhas no axe accessibility violations
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mEquityChart[2m > [22mrenders SVG with correct structure (no floating-point snapshot)
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mInvestmentMetricsSection[2m > [22mrenders the section head topic "Investment metrics"
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mInvestmentMetricsSection[2m > [22mrenders all 8 metric tile labels
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mInvestmentMetricsSection[2m > [22mshows the cap rate value formatted as a percentage
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mInvestmentMetricsSection[2m > [22mrenders the expense breakdown heading
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mInvestmentMetricsSection[2m > [22mrenders all 6 expense line-item labels
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mInvestmentMetricsSection[2m > [22mshows the property tax amount
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mInvestmentMetricsSection[2m > [22mshows condo fee annual amount
[32m✓[39m src/pages/landing.test.tsx[2m > [22mLandingPage[2m > [22mshows validation error when Analyze is clicked with empty input
[32m✓[39m src/pages/landing.test.tsx[2m > [22mLandingPage[2m > [22mrenders the sample listing buttons
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mInvestmentMetricsSection[2m > [22mhas no axe accessibility violations
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mInvestmentMetricsSection[2m > [22mmatches snapshot
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mNeighbourhoodSection[2m > [22mrenders the section head topic "Neighbourhood"
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mNeighbourhoodSection[2m > [22mrenders all 6 stat tile labels
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mNeighbourhoodSection[2m > [22mshows the median income value
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mNeighbourhoodSection[2m > [22mshows the Walk Score value
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mNeighbourhoodSection[2m > [22mrenders the comparable sales section
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mNeighbourhoodSection[2m > [22mrenders all 3 comparable sales entries
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mNeighbourhoodSection[2m > [22mshows the 5-year appreciation in the dark card
[32m✓[39m src/pages/landing.test.tsx[2m > [22mLandingPage[2m > [22mshows error state when a non-listing URL is submitted
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mNeighbourhoodSection[2m > [22mhas no axe accessibility violations
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mNeighbourhoodSection[2m > [22mmatches snapshot
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mSTRPlaceholderSection[2m > [22mrenders the section head topic "STR vs LTR"
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mSTRPlaceholderSection[2m > [22mshows "Coming Phase 2" chip
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mSTRPlaceholderSection[2m > [22mshows "AirDNA revenue modeling" placeholder text
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mSTRPlaceholderSection[2m > [22mshows Vaughan STR rule "Permitted with registration"
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mSTRPlaceholderSection[2m > [22mshows Toronto rule "Principal-residence only" in the other-cities table
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mSTRPlaceholderSection[2m > [22mshows Hamilton "Permitted" rule in the other-cities table
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mSTRPlaceholderSection[2m > [22mcorrectly identifies Hamilton municipality from addressLine2
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mSTRPlaceholderSection[2m > [22mrenders "Notify me when STR ships" button
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mSTRPlaceholderSection[2m > [22mhas no axe accessibility violations
[32m✓[39m ../../Week3-4 Front end/PR4/investor.test.tsx[2m > [22mSTRPlaceholderSection[2m > [22mmatches snapshot
[32m✓[39m ../../Week3-4 Front end/PR5/TenantReport.integration.test.tsx[2m > [22mTenantReport — ListedVsRealitySection visibility[2m > [22m§03 is present in the full page because CHARLES data has bad-tone mismatches[33m 432[2mms[22m[39m
[32m✓[39m ../../Week3-4 Front end/PR5/TenantReport.integration.test.tsx[2m > [22mTenantReport — ListedVsRealitySection visibility[2m > [22mCHARLES_REALITY has at least one bad-tone item (fixture sanity check)
[32m✓[39m ../../Week3-4 Front end/PR5/TenantReport.integration.test.tsx[2m > [22mTenantReport — ListedVsRealitySection visibility[2m > [22mCHARLES_LISTED and CHARLES_REALITY have the same length (required by component contract)
[32m✓[39m ../../Week3-4 Front end/PR5/TenantReport.integration.test.tsx[2m > [22mTenantReport — Confirm-before-signing checklist[2m > [22mrenders all CHARLES_CHECKLIST items
[32m✓[39m ../../Week3-4 Front end/PR5/TenantReport.integration.test.tsx[2m > [22mTenantReport — Confirm-before-signing checklist[2m > [22mshows the initial count "0 / N complete" where N = CHARLES_CHECKLIST.length
[32m✓[39m ../../Week3-4 Front end/PR5/TenantReport.integration.test.tsx[2m > [22mTenantReport — Confirm-before-signing checklist[2m > [22mchecking one checkbox increments the count to "1 / N complete"
[32m✓[39m ../../Week3-4 Front end/PR5/TenantReport.integration.test.tsx[2m > [22mTenantReport — Confirm-before-signing checklist[2m > [22mchecking all checkboxes shows "N / N complete"
[32m✓[39m ../../Week3-4 Front end/PR5/TenantReport.integration.test.tsx[2m > [22mTenantReport — Section ordering[2m > [22mall 12 data-section attributes are present in the rendered page
[32m✓[39m ../../Week3-4 Front end/PR5/TenantReport.integration.test.tsx[2m > [22mTenantReport — Section ordering[2m > [22msections appear in ascending 01–12 order in the DOM
[32m✓[39m ../../Week3-4 Front end/PR5/TenantReport.integration.test.tsx[2m > [22mTenantReport — Report Nav[2m > [22mshows "Tenant report" as the report label in the Nav
[32m✓[39m ../../Week3-4 Front end/PR5/TenantReport.integration.test.tsx[2m > [22mTenantReport — Report Nav[2m > [22mpasses the "3705-charles-st-e" address slug to the Nav
[32m✓[39m ../../Week3-4 Front end/PR5/TenantReport.integration.test.tsx[2m > [22mTenantReport — Report Nav[2m > [22mrenders a "Save report" button in the Nav
[32m✓[39m ../../Week3-4 Front end/PR5/TenantReport.integration.test.tsx[2m > [22mTenantReport — Report Nav[2m > [22mrenders the theme toggle button in the Nav
[32m✓[39m src/pages/landing.test.tsx[2m > [22mLandingPage[2m > [22mshows error state for a US Zillow URL
[32m✓[39m src/pages/landing.test.tsx[2m > [22mLandingPage[2m > [22mdismisses the error when "Dismiss" is clicked
[32m✓[39m src/pages/landing.test.tsx[2m > [22mLandingPage[2m > [22mrenders the How it works section
[32m✓[39m src/pages/landing.test.tsx[2m > [22mLandingPage[2m > [22mrenders the Pricing section
[32m✓[39m src/pages/landing.test.tsx[2m > [22mLandingPage[2m > [22mrenders the FAQ section heading
[32m✓[39m src/pages/landing.test.tsx[2m > [22mLandingPage[2m > [22mexpands an FAQ item on click
[32m✓[39m src/pages/landing.test.tsx[2m > [22mLandingPage[2m > [22mtoggles pricing to yearly
[32m✓[39m src/pages/landing.test.tsx[2m > [22mLandingPage[2m > [22mrenders the Footer
[32m✓[39m src/pages/landing.test.tsx[2m > [22mLandingPage[2m > [22mtoggles dark mode when the theme button is clicked
[32m✓[39m src/pages/landing.test.tsx[2m > [22mLandingPage[2m > [22mopens the sign-in modal when "Sign in" is clicked
[32m✓[39m ../../Week3-4 Front end/PR4/investor.page.test.tsx[2m > [22mInvestorReport page — loading state[2m > [22mrenders "Running analysis" loading label
[32m✓[39m ../../Week3-4 Front end/PR4/investor.page.test.tsx[2m > [22mInvestorReport page — loading state[2m > [22mrenders "Calculating investment metrics" sub text
[32m✓[39m ../../Week3-4 Front end/PR4/investor.page.test.tsx[2m > [22mInvestorReport page — loading state[2m > [22mdoes NOT render the PropertyHero section while loading
[32m✓[39m ../../Week3-4 Front end/PR4/investor.page.test.tsx[2m > [22mInvestorReport page — loading state[2m > [22mdoes NOT render section §01 while loading
[32m✓[39m ../../Week3-4 Front end/PR4/investor.page.test.tsx[2m > [22mInvestorReport page — error state[2m > [22mrenders the error heading
[32m✓[39m ../../Week3-4 Front end/PR4/investor.page.test.tsx[2m > [22mInvestorReport page — error state[2m > [22mrenders the error message text
[32m✓[39m ../../Week3-4 Front end/PR4/investor.page.test.tsx[2m > [22mInvestorReport page — error state[2m > [22mrenders a "Try again" button
[32m✓[39m ../../Week3-4 Front end/PR4/investor.page.test.tsx[2m > [22mInvestorReport page — error state[2m > [22mdoes NOT render section §01 in error state
[32m✓[39m ../../Week3-4 Front end/PR4/investor.page.test.tsx[2m > [22mInvestorReport page — loaded state (Vaughan / hard pass)[2m > [22mrenders the Nav with report variant (contains wordmark)
[32m✓[39m ../../Week3-4 Front end/PR4/investor.page.test.tsx[2m > [22mInvestorReport page — loaded state (Vaughan / hard pass)[2m > [22mrenders the property address in the hero section
[32m✓[39m ../../Week3-4 Front end/PR4/investor.page.test.tsx[2m > [22mInvestorReport page — loaded state (Vaughan / hard pass)[2m > [22mrenders the deal score gauge with score 8
[32m✓[39m ../../Week3-4 Front end/PR4/investor.page.test.tsx[2m > [22mInvestorReport page — loaded state (Vaughan / hard pass)[2m > [22mrenders the "Hard pass" verdict label
[32m✓[39m ../../Week3-4 Front end/PR4/investor.page.test.tsx[2m > [22mInvestorReport page — loaded state (Vaughan / hard pass)[2m > [22mrenders §01 Investment metrics section
[32m✓[39m ../../Week3-4 Front end/PR4/investor.page.test.tsx[2m > [22mInvestorReport page — loaded state (Vaughan / hard pass)[2m > [22mrenders §02 Financing scenarios section
[32m✓[39m ../../Week3-4 Front end/PR4/investor.page.test.tsx[2m > [22mInvestorReport page — loaded state (Vaughan / hard pass)[2m > [22mrenders §03 Rental comps section
[32m✓[39m ../../Week3-4 Front end/PR4/investor.page.test.tsx[2m > [22mInvestorReport page — loaded state (Vaughan / hard pass)[2m > [22mrenders §04 Cash to close section
[32m✓[39m ../../Week3-4 Front end/PR4/investor.page.test.tsx[2m > [22mInvestorReport page — loaded state (Vaughan / hard pass)[2m > [22mrenders §05 OSFI stress test section
[32m✓[39m ../../Week3-4 Front end/PR4/investor.page.test.tsx[2m > [22mInvestorReport page — loaded state (Vaughan / hard pass)[2m > [22mrenders §06 Risk flags section
[32m✓[39m ../../Week3-4 Front end/PR4/investor.page.test.tsx[2m > [22mInvestorReport page — loaded state (Vaughan / hard pass)[2m > [22mrenders §07 Equity build section
[32m✓[39m ../../Week3-4 Front end/PR4/investor.page.test.tsx[2m > [22mInvestorReport page — loaded state (Vaughan / hard pass)[2m > [22mrenders §08 Neighbourhood section
[32m✓[39m ../../Week3-4 Front end/PR4/investor.page.test.tsx[2m > [22mInvestorReport page — loaded state (Vaughan / hard pass)[2m > [22mrenders §09 SunScout placeholder section
[32m✓[39m ../../Week3-4 Front end/PR4/investor.page.test.tsx[2m > [22mInvestorReport page — loaded state (Vaughan / hard pass)[2m > [22mrenders §10 STR analysis placeholder section
[32m✓[39m ../../Week3-4 Front end/PR4/investor.page.test.tsx[2m > [22mInvestorReport page — loaded state (Vaughan / hard pass)[2m > [22mrenders §11 Due diligence checklist section
[32m✓[39m ../../Week3-4 Front end/PR4/investor.page.test.tsx[2m > [22mInvestorReport page — loaded state (Vaughan / hard pass)[2m > [22mshows the cap rate value in §01
[32m✓[39m ../../Week3-4 Front end/PR4/investor.page.test.tsx[2m > [22mInvestorReport page — loaded state (Vaughan / hard pass)[2m > [22mshows the LTT total $11,073 in §04
[32m✓[39m ../../Week3-4 Front end/PR4/investor.page.test.tsx[2m > [22mInvestorReport page — loaded state (Vaughan / hard pass)[2m > [22mshows the AI verdict block with eyebrow "Scout AI · investor verdict"
[32m✓[39m ../../Week3-4 Front end/PR4/investor.page.test.tsx[2m > [22mInvestorReport page — loaded state (Vaughan / hard pass)[2m > [22mshows the AIVerdictBlock model tag
[32m✓[39m ../../Week3-4 Front end/PR4/investor.page.test.tsx[2m > [22mInvestorReport page — loaded state (Vaughan / hard pass)[2m > [22mrisk flags for Vaughan (condo fee + cash flow) appear in §06
[32m✓[39m ../../Week3-4 Front end/PR4/investor.page.test.tsx[2m > [22mInvestorReport page — due diligence checklist[2m > [22mrenders "0 / 16 complete" initially
[32m✓[39m ../../Week3-4 Front end/PR4/investor.page.test.tsx[2m > [22mInvestorReport page — due diligence checklist[2m > [22mchecking an item updates the completion count
[32m✓[39m ../../Week3-4 Front end/PR4/investor.page.test.tsx[2m > [22mInvestorReport page — due diligence checklist[2m > [22mrenders the 4 category headers
[32m✓[39m ../../Week3-4 Front end/PR4/investor.page.test.tsx[2m > [22mInvestorReport page — dark mode toggle[2m > [22mtoggles data-theme on <html> when dark mode button is clicked
[32m✓[39m ../../Week3-4 Front end/PR4/investor.page.test.tsx[2m > [22mInvestorReport page — financing slider interaction[2m > [22mchanging the OSFI preset button calls updateFinancing with rate=0.0679
[32m✓[39m ../../Week3-4 Front end/PR4/investor.page.test.tsx[2m > [22mInvestorReport page — financing slider interaction[2m > [22mclicking Base preset calls updateFinancing with default values
[32m✓[39m ../../Week3-4 Front end/PR4/investor.page.test.tsx[2m > [22mInvestorReport page — snapshot[2m > [22mmatches loaded-state snapshot (Vaughan)
[32m✓[39m ../../Week3-4 Front end/PR4/investor.page.test.tsx[2m > [22mInvestorReport page — snapshot[2m > [22mmatches loading-state snapshot
[32m✓[39m ../../Week3-4 Front end/PR4/investor.page.test.tsx[2m > [22mInvestorReport page — snapshot[2m > [22mmatches error-state snapshot

[2m Test Files [22m [1m[32m19 passed[39m[22m[90m (19)[39m
[2m Tests [22m [1m[32m372 passed[39m[22m[90m (372)[39m
[2m Start at [22m 14:39:50
[2m Duration [22m 6.01s[2m (transform 2.89s, setup 9.76s, collect 8.92s, tests 11.90s, environment 38.95s, prepare 3.35s)[22m
