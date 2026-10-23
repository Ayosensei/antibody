/**
 * Antibody Copy Deck.
 * Source of truth: docs/DESIGN.md §11.
 * All user-facing strings live here; do not write strings inline.
 */

export const copy = {
  // 11.1 Launcher (S1)
  s1: {
    h1: {
      line1: "Attack your automation first.",
      line2: "Launch it with proof.",
    },
    sub: "Antibody attacks a sandbox copy of your automation, fixes what breaks, and explains every decision with evidence you can check.",
    mode: {
      sample: {
        on: "Sample data: on",
        off: "Sample data: off",
      },
      model: {
        meterless: "Model: Nightshift",
        nvidia: "Model: NVIDIA direct (fallback)",
        replay: "Model: replayed recordings",
      },
      zetaris: {
        up: "Zetaris: connected",
        fallback: "Zetaris: local store",
      },
      api: {
        down: "API unreachable",
      },
    },
    group: {
      target: "Choose an automation to test",
    },
    target: {
      support: {
        title: "Support email triage",
        desc: "Reads customer emails, can issue small refunds and update a customer record.",
      },
      meeting: {
        title: "Meeting notes to tasks",
        desc: "Reads meeting transcripts, creates tasks and posts a summary to the team.",
      },
    },
    attacks: {
      label: "Number of attacks",
      helper: "More attacks find more problems and take longer.",
    },
    memory: {
      label: "What Antibody remembers",
      warm: "Use memory",
      cold: "Start fresh",
      off: "No memory",
      warmHelper: "Reuse fixes learned in earlier runs.",
      coldHelper: "Ignore past fixes for this run only.",
      offHelper: "Don't read or save any fixes.",
      prefillHint: "Antibody will reuse fixes it learned on the first automation.",
    },
    custom: {
      toggle: "Add your own attack",
      help: "Paste text an attacker might hide in an email or transcript. Antibody will include it in this run.",
      where: "Where it appears",
      text: "Attack text",
      normal: "Normal text around it (optional)",
      add: "Add another attack",
      remove: "Remove this attack",
      count: (n: number) => `${n} of 5 attacks added`,
      max: "You can add up to 5 attacks.",
    },
    run: "Run Antibody",
    runStarting: "Starting run...",
    helper: {
      empty: "Choose an automation to test.",
      ready: (n: number, auto: string, mem: string) => `${n} attacks on ${auto}. Memory: ${mem}.`,
    },
    safety: "All data is fake. Attacks run only against sandbox automations.",
    recent: {
      h: "Recent runs",
      empty: "No runs yet. Finished runs on this browser will appear here.",
      more: "Show all",
    },
  },

  // 11.2 Run View (S2)
  s2: {
    new: "New run",
    state: {
      starting: "Starting",
      running: "Running",
      finished: "Finished",
      finishedWarn: "Finished with warnings",
      failed: "Failed",
    },
    stage: {
      1: "Set up",
      2: "Attack",
      3: "Diagnose",
      4: "Fix",
      5: "Verify",
      6: "Report",
    },
    loop: {
      finding: (i: number, n: number) => `Finding ${i} of ${n}`,
      attempt: (i: number, n: number) => `Attempt ${i} of ${n}`,
    },
    trace: {
      h: "Live trace",
      waiting: "Waiting for the first event...",
    },
    filter: {
      all: "All",
      fix: "Fix loop",
      memory: "Memory",
      zetaris: "Zetaris",
      explain: "Explanations",
    },
    pause: "Pause scrolling",
    resume: "Resume scrolling",
    jump: {
      latest: "Jump to latest",
    },
    earlier: "Show earlier lines",
    row: {
      received: "Received",
      produced: "Produced",
      goesto: "Goes to",
    },
    progress: {
      calls: "Model calls",
      zetaris: "Zetaris queries",
      attempts: "Fix attempts",
      elapsed: "Elapsed",
      queue: (n: number) => `${n} findings left`,
      settings: "Run settings",
      headsup: "Heads up",
      none: "Nothing to flag.",
    },
    finished: {
      banner: (verdict: string) => `Run finished. ${verdict}.`,
      jump: "Jump to report",
    },
    stream: {
      lost: "Lost connection to the trace stream. Reconnecting...",
      dead: {
        title: "Can't reconnect.",
        body: "Your run may still be going.",
      },
      reload: "Reload this page",
    },
    failed: {
      title: "This run stopped before it finished.",
      again: "Run again",
    },
    back: "Back to launcher",
    notfound: {
      title: "We can't find that run.",
      body: "It may have been started on a different machine, or the API was restarted.",
    },
  },

  // 11.3 Report (S2b)
  s2b: {
    h: "Report",
    verdict: {
      ready: "Ready to launch",
      risks: "Ready with risks",
      not: "Not ready",
      why: "Why this verdict?",
    },
    download: "Download report (JSON)",
    again: "Run another automation",
    sentence: {
      none: (passed: number, total: number) =>
        `No attack succeeded in this run. ${passed} of ${total} normal tasks pass.`,
      rate: (before: number, after: number, passed: number, total: number) =>
        `Attack success rate went from ${before.toFixed(3)} to ${after.toFixed(3)}. ${passed} of ${total} normal tasks still pass.`,
      unresolved: (n: number) =>
        n === 1 ? "1 attack could not be fixed." : `${n} attacks could not be fixed.`,
      broke: (n: number) =>
        n === 1 ? "1 normal task broke." : `${n} normal tasks broke.`,
    },
    metric: {
      asr: "Attack success rate",
      asrFoot: (hitsBefore: number, total: number, hitsAfter: number) =>
        `${hitsBefore} of ${total} attacks succeeded before. ${hitsAfter} after.`,
      tasks: "Normal tasks passing",
      tasksOk: "No normal task broke.",
      fixes: "Fixes accepted",
      fixesFoot: (rejected: number, total: number) =>
        `${rejected} fix(es) rejected on the way. ${total} proposals in total.`,
      unres: "Unresolved attacks",
      unresZero: "None left.",
      unresSome: "Needs attention",
    },
    findings: {
      h: "What broke and how it was fixed",
      empty: {
        title: "No attack succeeded, so nothing needed fixing.",
        body: "This does not prove the automation is safe. See what is still risky below.",
      },
      cols: "Attack / Type / What happened / Cause / Fix / Tries / Outcome",
      pruned: (n: number) =>
        `${n} other attack(s) stopped working after an earlier fix, so they did not need their own.`,
    },
    outcome: {
      fixed: "Fixed",
      fallback: "Fixed with fallback",
      unresolved: "Unresolved",
    },
    tag: {
      yours: "Your attack",
      memory: "Used memory",
      fallback: "Fallback",
    },
    panel: {
      attack: "The attack",
      where: "Where it appears",
      type: "Attack type",
      happened: "What happened",
      why: "Why it worked",
      attempts: "Fix attempts",
      memory: "Memory",
    },
    attempt: {
      num: (n: number) => `Attempt ${n}`,
      accepted: "Accepted",
      rejected: "Rejected",
      notverified: "Not verified",
      origin: {
        llm: "Written by Antibody",
        memory: "Based on memory",
        fallback: "Fallback",
      },
      changes: "What changed",
      whyfix: "Why this fix",
      result: "Result of verification",
      ok: "This fix blocked the attack and no normal task broke.",
    },
    diff: {
      h: "Guardrails before and after",
      before: "Before",
      after: "After",
      rules: "Rules for the model",
      tools: "Tool permissions",
      filters: "Input filters",
      added: "added",
      changed: "changed",
      none: "No guardrails changed in this run.",
    },
    risks: {
      h: "What is still risky",
      unres: (id: string, detail: string) => `Attack ${id} could not be fixed: ${detail}`,
      fallback: "Attack classes outside this library were not tested.",
    },
    mine: {
      h: "Your attacks",
      hit: "Succeeded",
      blocked: "Blocked",
      error: "Errored",
    },
    memory: {
      h: "What Antibody remembered",
      used: "Used from earlier runs",
      saved: "Saved from this run",
      noneUsed: "Nothing was used.",
      noneSaved: "Nothing was saved.",
    },
    evidence: {
      h: "Evidence and files",
      trace: "Trace file",
      note: "Every claim in this report links to evidence from this run.",
    },
  },

  // 11.4 Explanations
  expl: {
    checked: {
      badge: "Evidence checked",
      line: "Checked: every piece of evidence below exists in this run.",
    },
    unverified: {
      badge: "Unverified explanation",
      body: "This explanation could not be fully checked against the run's evidence. Treat it as a hint, not a fact.",
      all: "Show all checks that failed",
    },
    kind: {
      observation: "Observation",
      cause: "Cause",
      decision: "Decision",
      outcome: "Outcome",
      risk: "Risk",
    },
    by: {
      code: "Generated from run data",
      llm: "Written by Antibody's model",
    },
    missing: "No explanation was produced for this step.",
    title: {
      diagnosis: "Why it worked",
      fix: "Why this fix",
      accepted: "Why it was accepted",
      rejected: "Why it was rejected",
      unresolved: "Why it could not be fixed",
      readiness: "Why this verdict",
    },
  },

  // 11.5 Verification rejection reasons
  rejections: {
    attack_still_hits: {
      heading: "The attack still worked",
      text: "After this fix the same attack still succeeded.",
    },
    prior_fix_broken: {
      heading: "An earlier fix stopped working",
      text: "This fix undid protection added earlier.",
    },
    regression_break: {
      heading: "A normal task broke",
      text: (tasks: string) => `The fix stopped a normal task from working: ${tasks}.`,
    },
    fix_invalid: {
      heading: "The fix was not valid",
      text: "The proposed change did not pass Antibody's checks.",
    },
    duplicate_fix: {
      heading: "The same fix was tried before",
      text: "This fix matched an earlier rejected attempt.",
    },
  },

  // 11.6 Degraded banner copy
  degraded: {
    zetaris_fallback: "Zetaris was unreachable, so the local data store answered the same queries.",
    memory_unavailable: "The fix library was unavailable, so this run did not use or save fixes.",
    budget_exhausted: "The run hit its call or time budget, so results may be incomplete.",
    high_error_rate: "More than 20% of attack runs errored. Treat the numbers with care.",
    verifier_error: "A verification could not be completed, so some fixes were rejected for safety.",
    unverified_explanation: "Some explanations could not be fully checked against evidence. They are marked.",
  },

  // 11.7 Validation errors in plain words
  validationRules: {
    "V-1": "The explanation had too many or too few claims.",
    "V-2": "A claim had no evidence.",
    "V-3": "A claim cited evidence that is not part of this run.",
    "V-4": "The explanation left out evidence it is required to cite.",
    "V-5": "A claim contained a secret value.",
    "V-6": "A claim did not match what the judge found.",
    "V-7": "A claim named the wrong data source.",
  },

  // 11.8 Generic & Footer
  footer: "Antibody. Built for the Open Agent Hackathon 2026.",
  notfound: {
    title: "We can't find that page.",
    body: "Check the address, or go back to the launcher.",
    cta: "Back to launcher",
  },
  toast: {
    copied: "Copied",
    copyfail: "Couldn't copy. Select the text and copy it yourself.",
    downloaded: "Report downloaded",
  },
};
