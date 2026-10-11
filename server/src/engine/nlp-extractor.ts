/**
 * NLP Fact Extractor
 * Heuristic rules and regular expressions for robust, deterministic fact extraction
 * from conversational Indian English customer utterances.
 */

import {
  ExtractedFacts,
  IncomeMode,
  OccupationType,
  OwnershipStatus,
  PropertyType
} from '../types.js';

export class NLPExtractor {
  /**
   * Parse Indian currency strings into numeric INR
   * Handles: "50 lakhs", "₹75 lakh", "1 crore", "90L", "₹1.5 cr", "50,00,000"
   */
  public static parseCurrencyINR(text: string): number | null {
    const clean = text.toLowerCase().replace(/,/g, '');

    // Pattern: Crore (e.g., "1 crore", "1.5 cr", "2 crores")
    const crMatch = clean.match(/(\d+(?:\.\d+)?)\s*(?:cr|crore|crores)\b/);
    if (crMatch) {
      return Math.round(parseFloat(crMatch[1]) * 10000000);
    }
    if (/\bone\s+crore\b/.test(clean)) return 10000000;
    if (/\btwo\s+crores?\b/.test(clean)) return 20000000;

    // Word based Lakhs: "forty lakh", "fifty lakhs", "seventy-five lakh", "ninety lakh"
    const wordLakhs: Record<string, number> = {
      'ten': 10, 'fifteen': 15, 'twenty': 20, 'twenty-five': 25, 'twenty five': 25,
      'thirty': 30, 'thirty-five': 35, 'thirty five': 35,
      'forty': 40, 'forty-five': 45, 'forty five': 45,
      'fifty': 50, 'fifty-five': 55, 'fifty five': 55,
      'sixty': 60, 'sixty-five': 65, 'sixty five': 65,
      'seventy': 70, 'seventy-five': 75, 'seventy five': 75,
      'eighty': 80, 'eighty-five': 85, 'eighty five': 85,
      'ninety': 90, 'ninety-five': 95, 'ninety five': 95,
      'one hundred': 100
    };

    for (const [word, val] of Object.entries(wordLakhs)) {
      const reg = new RegExp(`\\b${word}\\s+lakhs?\\b`, 'i');
      if (reg.test(clean)) {
        return val * 100000;
      }
    }

    // Numeric Lakhs: "50 lakh", "75 lakhs", "90 lac", "₹50l"
    const lakhMatch = clean.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lakhs|lac|lacs|l)\b/);
    if (lakhMatch) {
      return Math.round(parseFloat(lakhMatch[1]) * 100000);
    }

    // Direct numbers: ₹5000000 or 5000000
    const numMatch = clean.match(/(?:rs\.?|inr|₹)?\s*(\d{5,9})\b/);
    if (numMatch) {
      return parseInt(numMatch[1], 10);
    }

    return null;
  }

  /**
   * Parse Repayment Tenure in years
   */
  public static parseTenure(text: string): number | null {
    const clean = text.toLowerCase();

    // Check correction pattern first: "make that 12 years", "actually, make that 12 years"
    const correctionMatch = clean.match(/(?:actually,?\s*(?:make that|make it)?|make that|make it|change to|rather)\s+(\d{1,2})\s*(?:years?|yrs?|yr)?/i);
    if (correctionMatch) {
      return parseInt(correctionMatch[1], 10);
    }

    // Word tenure: "three years", "ten years", "twelve years", "fifteen years", "two years", "sixteen years"
    const wordTenure: Record<string, number> = {
      'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
      'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
      'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
      'sixteen': 16, 'twenty': 20
    };

    for (const [word, val] of Object.entries(wordTenure)) {
      const reg = new RegExp(`\\b${word}\\s*(?:years?|yrs?)\\b`, 'i');
      if (reg.test(clean)) {
        return val;
      }
    }

    // Numeric tenure: "5 years", "10 yrs", "12 years", "15"
    const digitMatch = clean.match(/\b(\d{1,2})\s*(?:years?|yrs?|yr)\b/);
    if (digitMatch) {
      return parseInt(digitMatch[1], 10);
    }

    // Standalone number in tenure context
    if (/(?:tenure|period|term|duration)/i.test(clean)) {
      const standalone = clean.match(/\b(\d{1,2})\b/);
      if (standalone) return parseInt(standalone[1], 10);
    }

    return null;
  }

  /**
   * Extract all structured facts from an utterance using rule patterns
   */
  public static extractFacts(utterance: string, contextState?: any): ExtractedFacts {
    const clean = utterance.toLowerCase();
    const facts: ExtractedFacts = {};

    // 1. Property Type
    if (/\bagricultur(?:al|e)|farm(?:land)?\b/i.test(clean)) {
      facts.propertyType = PropertyType.AGRICULTURAL;
    } else if (/\bresidential|house|flat|apartment|villa|home\b/i.test(clean)) {
      facts.propertyType = PropertyType.RESIDENTIAL;
    } else if (/\bcommercial|shop|office|retail|mall\b/i.test(clean)) {
      facts.propertyType = PropertyType.COMMERCIAL;
    } else if (/\bindustrial|factory|shed|warehouse|plant\b/i.test(clean)) {
      facts.propertyType = PropertyType.INDUSTRIAL;
    }

    // 2. Ownership Status
    if (/\bjoint(?:ly)?|co-own(?:ed)?|with my (?:wife|husband|spouse|brother|father|mother|family)|shared\b/i.test(clean)) {
      facts.ownershipStatus = OwnershipStatus.JOINT;
    } else if (/\bsole(?:ly)?|single|myself|only me|my own|individual\b/i.test(clean)) {
      facts.ownershipStatus = OwnershipStatus.SOLE;
    }

    // 3. Original Property Documents
    if (/\b(?:only copies|photocop(?:y|ies)|xerox|copies only|duplicates? only|lost|don't have original|no original)\b/i.test(clean)) {
      facts.originalDocuments = false;
    } else if (
      /\b(?:yes|original(?:s)?\s+(?:deeds|documents|papers|title deeds)?\s*(?:are\s+)?(?:available|with me|at home|ready)|in (?:the )?(?:locker|safe)|papers at home|deeds at home|have the original|deeds are available|documents are available)\b/i.test(clean) ||
      (/\boriginal/i.test(clean) && /\b(?:available|ready|with me|at home|in locker)\b/i.test(clean))
    ) {
      facts.originalDocuments = true;
    }

    // 4. Occupation & Income Mode
    if (/\bsalaried|job|employee|employed|working in (?:an?|a)\b/i.test(clean)) {
      facts.occupation = OccupationType.SALARIED;
    } else if (/\bself[- ]employed|business|shop owner|freelance|consultant|own business\b/i.test(clean)) {
      facts.occupation = OccupationType.SELF_EMPLOYED;
    }

    if (/\bcash(?:-in-hand| in hand)?|by cash|in cash\b/i.test(clean)) {
      facts.incomeMode = IncomeMode.CASH;
    } else if (/\bbank(?:ing)?|account|online transfer|direct deposit|neft|cheque|credited\b/i.test(clean)) {
      facts.incomeMode = IncomeMode.BANK;
    }

    // 5. Existing Property Loan & EMI Reduction
    if (/\b(?:loan on (?:this|the) property|mortgage on (?:this|the) property|existing (?:home|property) loan|running loan on (?:this|the) house)\b/i.test(clean)) {
      facts.existingPropertyLoan = true;
    }
    if (/\b(?:reduce (?:my )?emi|lower (?:my )?emi|balance transfer|transfer (?:my )?loan|cut down (?:the )?emi)\b/i.test(clean)) {
      facts.emiReductionRequested = true;
    }

    // 6. Customer Availability / Busy
    if (/\b(?:busy|driving|in a meeting|can'?t talk|call (?:me )?(?:back|later)|not free)\b/i.test(clean)) {
      facts.isBusy = true;
      const timeMatch = clean.match(/(?:call (?:at|after)|at|after)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?|\d{1,2}\s*(?:pm|am)|tomorrow(?:\s+at\s+\d{1,2}(?:am|pm)?)?)/i);
      if (timeMatch) {
        facts.callbackTime = timeMatch[1].trim();
      }
    }

    // 7. Customer Decline
    if (/\b(?:not interested|don'?t want|no thanks|cancel|stop calling|decline)\b/i.test(clean)) {
      facts.customerDeclined = true;
    }

    // 8. ₹75 Lakhs Cap Alternative Agreement
    if (/\b(?:yes proceed with (?:75|75 lakh)|okay with 75|agree to 75|fine with 75|75 lakh is fine|75 is okay|yes 75 lakh)\b/i.test(clean)) {
      facts.maxAmountAccepted = true;
    } else if (/\b(?:no 75 is not enough|need more than 75|cannot proceed with 75|decline 75|not interested with 75)\b/i.test(clean)) {
      facts.maxAmountAccepted = false;
    }

    // 9. Loan Amount vs Market Value Disambiguation
    // Check if sentence distinguishes value from loan amount:
    // e.g. "worth 1 crore and I need 50 lakh" or "market value is 80 lakhs, need 40 lakhs"
    const worthMatch = clean.match(/(?:worth|value(?:d)?(?: at)?|market value(?: of)?)\s+([^,;]+)/i);
    const needMatch = clean.match(/(?:need|require|want|looking for|loan (?:of|amount))\s+([^,;]+)/i);

    if (worthMatch && needMatch) {
      facts.marketValueInr = this.parseCurrencyINR(worthMatch[1]);
      facts.loanAmountInr = this.parseCurrencyINR(needMatch[1]);
    } else if (worthMatch) {
      facts.marketValueInr = this.parseCurrencyINR(worthMatch[1]);
    } else if (needMatch) {
      facts.loanAmountInr = this.parseCurrencyINR(needMatch[1]);
    } else {
      // Fallback check depending on conversation context
      const parsedCurr = this.parseCurrencyINR(clean);
      if (parsedCurr !== null) {
        if (contextState?.checklist?.desiredLoanAmount?.value === null) {
          facts.loanAmountInr = parsedCurr;
        } else if (contextState?.checklist?.marketValue?.value === null) {
          facts.marketValueInr = parsedCurr;
        }
      }
    }

    // 10. Desired Tenure
    const parsedTenure = this.parseTenure(clean);
    if (parsedTenure !== null) {
      facts.tenureYears = parsedTenure;
    }

    return facts;
  }

  /**
   * Check if utterance is an ambiguous document response
   */
  public static isAmbiguousDocuments(utterance: string): boolean {
    const clean = utterance.toLowerCase();
    return /\b(?:should be somewhere|might have them|not sure|have to check|probably somewhere|will search)\b/i.test(clean);
  }

  /**
   * Check if utterance is asking about interest rates
   */
  public static isInterestRateQuestion(utterance: string): boolean {
    const clean = utterance.toLowerCase();
    return (
      /\b(?:what(?:'s| is) (?:the |your |the current )?(?:interest|roi|rate|interest rate)|rate of interest|how much interest)\b/i.test(clean) ||
      (/\b(?:interest|roi)\b/i.test(clean) && /\b(?:rate|charge|what|how much|offer)\b/i.test(clean))
    );
  }

  /**
   * Check if utterance is an unrelated question or diversion
   */
  public static isUnrelatedQuestion(utterance: string): boolean {
    const clean = utterance.toLowerCase();
    return /\b(?:what company|who are you|where are you located|how did you get my number|what time is it)\b/i.test(clean);
  }
}
