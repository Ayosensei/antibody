import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { runSql } from "../src/adapters/zetaris.js";
import { createApiClient } from "../scripts/api-client.js";

describe("Task T-D5: Zetaris Table Registration Spike", () => {
  it("scripts/zetaris/register_tables.sql exists and contains PokeAPI DDL pattern", () => {
    const ddlPath = path.resolve(process.cwd(), "scripts/zetaris/register_tables.sql");
    expect(fs.existsSync(ddlPath)).toBe(true);
    const content = fs.readFileSync(ddlPath, "utf-8");

    // Verify PokeAPI recipe 4-statement pattern
    expect(content).toContain("CREATE LIGHTNING DATABASE");
    expect(content).toContain("CREATE SCHEMASTORE CONTAINER");
    expect(content).toContain("CREATE LIGHTNING REST TABLE");
    expect(content).toContain("CREATE OR REPLACE SCHEMASTORE VIEW");

    // Verify all 4 tables
    expect(content).toContain("antibody.attacks");
    expect(content).toContain("antibody.policies");
    expect(content).toContain("antibody.traces");
    expect(content).toContain("antibody.fixes");
  });

  it("Zetaris source endpoints conform to DATA_CONTRACTS §13 schemas", async () => {
    const client = await createApiClient();
    try {
      // 1. Attacks source
      const atkRes = await fetch(`${client.baseUrl}/zetaris-sources/attacks`);
      expect(atkRes.ok).toBe(true);
      const atks = (await atkRes.json()) as any[];
      expect(atks.length).toBeGreaterThanOrEqual(14);
      expect(atks[0]).toHaveProperty("attack_id");
      expect(atks[0]).toHaveProperty("class");
      expect(atks[0]).toHaveProperty("target_scope");
      expect(atks[0]).toHaveProperty("carrier");
      expect(atks[0]).toHaveProperty("benign_text");
      expect(atks[0]).toHaveProperty("injection_text");
      expect(atks[0]).toHaveProperty("placement");
      expect(atks[0]).toHaveProperty("source");
      expect(atks[0]).toHaveProperty("priority");

      // 2. Policies source
      const polRes = await fetch(`${client.baseUrl}/zetaris-sources/policies`);
      expect(polRes.ok).toBe(true);
      const pols = (await polRes.json()) as any[];
      expect(pols.length).toBeGreaterThanOrEqual(7);
      expect(pols[0]).toHaveProperty("target_id");
      expect(pols[0]).toHaveProperty("tool");
      expect(pols[0]).toHaveProperty("allowed");
      expect(pols[0]).toHaveProperty("rule_json");
    } finally {
      await client.close();
    }
  });

  it("Check Z-4: adapter queries at least 5 attacks for support_triage and policies rows", async () => {
    const attackRes = await runSql(
      "SELECT attack_id, class, target_scope, carrier FROM attacks WHERE target_scope LIKE '%support_triage%' LIMIT 5;"
    );
    expect(attackRes.rows.length).toBe(5);
    expect(["zetaris", "local"]).toContain(attackRes.source);

    const policyRes = await runSql(
      "SELECT target_id, tool, allowed, rule_json FROM policies WHERE target_id = 'support_triage';"
    );
    expect(policyRes.rows.length).toBeGreaterThanOrEqual(4);
    expect(["zetaris", "local"]).toContain(policyRes.source);
  });
});
