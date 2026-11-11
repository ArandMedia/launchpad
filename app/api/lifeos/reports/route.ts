import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { lifeOSOwner } from "@/lib/lifeos-auth";
import { decryptHealthPayload } from "@/lib/lifeos-core";
import { isCalendarDate } from "@/lib/lifeos-health";
import { routineOccurrences, type ScheduledRoutine } from "@/lib/lifeos-routines";
import { REPORT_KEYS, reportDefinition, type GeneratedReport, type ReportKey, type ReportMetric, type ReportSection } from "@/lib/lifeos-reports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fail = () => NextResponse.json({ error: "Not found" }, { status: 404 });
const invalid = (message: string) => NextResponse.json({ error: message }, { status: 400 });
const whole = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

function rangeFrom(req: NextRequest) {
  const now = new Date();
  const defaultEnd = now.toISOString().slice(0, 10);
  const defaultStartDate = new Date(now);
  defaultStartDate.setUTCDate(defaultStartDate.getUTCDate() - 29);
  const startValue = req.nextUrl.searchParams.get("start") || defaultStartDate.toISOString().slice(0, 10);
  const endValue = req.nextUrl.searchParams.get("end") || defaultEnd;
  if (!isCalendarDate(startValue) || !isCalendarDate(endValue) || startValue > endValue) return null;
  const start = new Date(`${startValue}T00:00:00.000Z`);
  const endExclusive = new Date(`${endValue}T00:00:00.000Z`);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
  if (endExclusive.valueOf() - start.valueOf() > 10 * 366 * 86_400_000) return null;
  return { startValue, endValue, start, endExclusive };
}

function percentage(numerator: number, denominator: number) {
  return denominator ? Math.round(numerator / denominator * 100) : 0;
}

function hours(milliseconds: number) {
  return oneDecimal.format(milliseconds / 3_600_000);
}

function metric(label: string, value: string | number, detail: string, tone: ReportMetric["tone"] = "neutral"): ReportMetric {
  return { label, value: String(value), detail, tone };
}

function section(title: string, items: Array<string | null | undefined | false>): ReportSection {
  return { title, items: items.filter((item): item is string => Boolean(item)) };
}

function average(values: number[]) {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : null;
}

export async function GET(req: NextRequest) {
  const ownerId = await lifeOSOwner();
  if (!ownerId) return fail();
  const key = req.nextUrl.searchParams.get("report") as ReportKey | null;
  if (!key || !REPORT_KEYS.includes(key)) return invalid("Choose a valid report");
  const range = rangeFrom(req);
  if (!range) return invalid("Choose a valid report range of ten years or less");

  const [domains, goals, actions, routines, routineRecords, blocks, reviews, principles, commitments, metricDefinitions, measurements, healthMeasurements, projects, clients, tasks, milestones, updates, calendarFeeds, integrations, reviewCycles] = await Promise.all([
    db.lifeOSDomainState.findMany({ where: { ownerId } }),
    db.lifeOSGoal.findMany({ where: { ownerId }, orderBy: { createdAt: "desc" } }),
    db.lifeOSAction.findMany({ where: { ownerId }, orderBy: { createdAt: "desc" } }),
    db.lifeOSRoutine.findMany({ where: { ownerId }, orderBy: { createdAt: "desc" }, include: { objective: { select: { title: true } } } }),
    db.lifeOSRoutineOccurrence.findMany({ where: { ownerId, date: { gte: range.start, lt: range.endExclusive } }, orderBy: { date: "asc" } }),
    db.lifeOSTimeBlock.findMany({ where: { ownerId, startAt: { lt: range.endExclusive }, endAt: { gt: range.start } }, orderBy: { startAt: "asc" }, select: { id: true, title: true, status: true, startAt: true, endAt: true, projectId: true, taskId: true, milestoneId: true, category: true } }),
    db.lifeOSReview.findMany({ where: { ownerId, date: { gte: range.start, lt: range.endExclusive } }, orderBy: { date: "desc" } }),
    db.lifeOSPrinciple.findMany({ where: { ownerId, active: true }, orderBy: [{ importance: "desc" }, { createdAt: "desc" }] }),
    db.lifeOSRelationshipCommitment.findMany({ where: { ownerId, active: true }, orderBy: { createdAt: "desc" } }),
    db.lifeOSMetricDefinition.findMany({ where: { ownerId, active: true }, orderBy: { createdAt: "asc" } }),
    db.lifeOSMeasurement.findMany({ where: { ownerId, observedAt: { gte: range.start, lt: range.endExclusive } }, orderBy: { observedAt: "desc" }, take: 10000 }),
    db.lifeOSHealthMeasurement.findMany({ where: { ownerId, observedAt: { gte: range.start, lt: range.endExclusive } }, orderBy: { observedAt: "desc" }, take: 10000 }),
    db.project.findMany({ where: { archivedAt: null }, orderBy: { updatedAt: "desc" }, take: 1000, select: { id: true, name: true, status: true, targetDate: true, updatedAt: true, clientId: true, client: { select: { name: true, companyName: true } } } }),
    db.client.findMany({ where: { archivedAt: null }, orderBy: { createdAt: "desc" }, take: 1000, select: { id: true, name: true, companyName: true, createdAt: true } }),
    db.task.findMany({ where: { project: { archivedAt: null } }, orderBy: { updatedAt: "desc" }, take: 5000, select: { id: true, title: true, status: true, dueDate: true, updatedAt: true, projectId: true } }),
    db.milestone.findMany({ where: { project: { archivedAt: null } }, orderBy: { createdAt: "desc" }, take: 5000, select: { id: true, title: true, targetDate: true, completedAt: true, projectId: true } }),
    db.update.findMany({ where: { project: { archivedAt: null }, createdAt: { gte: range.start, lt: range.endExclusive } }, orderBy: { createdAt: "desc" }, take: 1000, select: { id: true, createdAt: true, projectId: true, clientVisible: true } }),
    db.lifeOSCalendarFeed.findMany({ where: { ownerId }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, active: true, lastSyncedAt: true, lastError: true } }),
    db.lifeOSIntegrationConnection.findMany({ where: { ownerId }, orderBy: { providerKey: "asc" } }),
    db.lifeOSReviewCycle.findMany({ where: { ownerId, periodStart: { gte: range.start, lt: range.endExclusive } }, orderBy: { periodStart: "desc" }, take: 500 }),
  ]);

  const definitionById = new Map(metricDefinitions.map((definition) => [definition.id, definition]));
  const regularEvidence = measurements.flatMap((record) => {
    const definition = definitionById.get(record.metricId);
    return definition ? [{ name: definition.name, domainKey: definition.domainKey, unit: definition.unit, value: record.value, observedAt: record.observedAt }] : [];
  });
  const healthEvidence = healthMeasurements.flatMap((record) => {
    const definition = definitionById.get(record.metricId);
    if (!definition) return [];
    try {
      const payload = decryptHealthPayload(record);
      return [{ name: definition.name, metricKey: definition.metricKey, unit: definition.unit, value: payload.value, observedAt: record.observedAt }];
    } catch {
      return [];
    }
  });

  const scheduledRoutines: ScheduledRoutine[] = routines.map(({ objective, scheduleStartsOn, ...routine }) => ({
    ...routine,
    scheduleStartsOn: scheduleStartsOn?.toISOString() ?? null,
    objectiveTitle: objective?.title ?? "",
  }));
  const expectedRoutineOccurrences = routineOccurrences(scheduledRoutines, range.start, range.endExclusive);
  const routineComplete = routineRecords.filter((record) => record.status === "COMPLETED").length;
  const routineSkipped = routineRecords.filter((record) => record.status === "SKIPPED").length;
  const routineOpen = Math.max(0, expectedRoutineOccurrences.length - routineComplete - routineSkipped);
  const routineTracked = Math.max(expectedRoutineOccurrences.length, routineRecords.length);
  const routineRate = percentage(routineComplete, routineTracked);
  const blockComplete = blocks.filter((block) => block.status === "COMPLETED");
  const blockSkipped = blocks.filter((block) => block.status === "SKIPPED");
  const scheduledMilliseconds = blocks.reduce((total, block) => total + Math.max(0, block.endAt.valueOf() - block.startAt.valueOf()), 0);
  const completedMilliseconds = blockComplete.reduce((total, block) => total + Math.max(0, block.endAt.valueOf() - block.startAt.valueOf()), 0);
  const taskDone = tasks.filter((task) => task.status === "DONE");
  const openTasks = tasks.filter((task) => task.status !== "DONE");
  const overdueTasks = openTasks.filter((task) => task.dueDate && task.dueDate < new Date());
  const completedMilestones = milestones.filter((milestone) => milestone.completedAt);
  const overdueMilestones = milestones.filter((milestone) => !milestone.completedAt && milestone.targetDate && milestone.targetDate < new Date());
  const activeProjects = projects.filter((project) => project.status !== "COMPLETE");
  const blockedProjects = projects.filter((project) => project.status === "BLOCKED");
  const overdueProjects = activeProjects.filter((project) => project.targetDate && project.targetDate < new Date());
  const openGoals = goals.filter((goal) => !goal.done);
  const completedGoals = goals.filter((goal) => goal.done);
  const overdueGoals = openGoals.filter((goal) => goal.targetDate && goal.targetDate < new Date());
  const openActions = actions.filter((action) => action.status === "OPEN");
  const connectedFeeds = calendarFeeds.filter((feed) => feed.active);
  const connectedIntegrations = integrations.filter((integration) => integration.status === "CONNECTED");
  const financialEvidence = regularEvidence.filter((item) => ["WEALTH", "ARANDMEDIA"].includes(item.domainKey) && /(revenue|income|expense|cost|cash|receivable|profit|margin|runway|debt|savings|net worth)/i.test(item.name));
  const financialByName = new Map<string, (typeof financialEvidence)[number]>();
  for (const item of financialEvidence) if (!financialByName.has(item.name)) financialByName.set(item.name, item);
  const latestFinancial = [...financialByName.values()];
  const clientProjectCounts = new Map<string, { active: number; complete: number }>();
  for (const project of projects) {
    const counts = clientProjectCounts.get(project.clientId) ?? { active: 0, complete: 0 };
    if (project.status === "COMPLETE") counts.complete += 1; else counts.active += 1;
    clientProjectCounts.set(project.clientId, counts);
  }
  const dormantClients = clients.filter((client) => !(clientProjectCounts.get(client.id)?.active));
  const recentLessons = reviews.flatMap((review) => [review.learned, review.next]).filter(Boolean).slice(0, 8);
  const today = new Date();
  const sourceNames = [
    "LaunchPAD Calendar and execution history",
    "LifeOS Pillars, outcomes, routines, actions, and AARs",
    "LaunchPAD projects, tasks, milestones, updates, and clients",
    healthEvidence.length ? "Encrypted manual health history" : null,
    connectedFeeds.length ? `${connectedFeeds.length} connected public calendar${connectedFeeds.length === 1 ? "" : "s"}` : null,
    regularEvidence.length ? "Manually recorded LifeOS measurements" : null,
  ].filter((value): value is string => Boolean(value));

  function domainStats(domainKey: string) {
    const domainGoals = goals.filter((goal) => goal.domainKey === domainKey);
    const domainActions = actions.filter((action) => action.domainKey === domainKey);
    const domainRoutines = routines.filter((routine) => routine.domainKey === domainKey);
    const domainEvidence = regularEvidence.filter((entry) => entry.domainKey === domainKey);
    return {
      state: domains.find((domain) => domain.domainKey === domainKey),
      goals: domainGoals,
      openGoals: domainGoals.filter((goal) => !goal.done),
      completedGoals: domainGoals.filter((goal) => goal.done),
      actions: domainActions,
      openActions: domainActions.filter((action) => action.status === "OPEN"),
      routines: domainRoutines,
      activeRoutines: domainRoutines.filter((routine) => routine.active),
      evidence: domainEvidence,
    };
  }

  const health = domainStats("HEALTH");
  const wealth = domainStats("WEALTH");
  const relationships = domainStats("RELATIONSHIPS");
  const self = domainStats("SELF");
  const arand = domainStats("ARANDMEDIA");
  const omnis = domainStats("OMNIS");
  const definition = reportDefinition(key);
  const periodLabel = `${range.startValue} through ${range.endValue}`;
  const base = {
    key,
    title: definition.title,
    description: definition.description,
    periodLabel,
    generatedAt: new Date().toISOString(),
    sources: sourceNames,
  };

  let result: GeneratedReport;
  if (key === "EXECUTIVE") {
    result = { ...base,
      summary: `Across ${whole.format(activeProjects.length)} active projects and ${whole.format(openGoals.length)} active LifeOS outcomes, execution is ${percentage(blockComplete.length, blocks.length)}% complete for scheduled work and ${routineRate}% complete for expected routines in this period.`,
      metrics: [
        metric("Active projects", activeProjects.length, `${blockedProjects.length} blocked · ${overdueProjects.length} past target`, blockedProjects.length || overdueProjects.length ? "warning" : "good"),
        metric("Scheduled work", `${percentage(blockComplete.length, blocks.length)}%`, `${blockComplete.length} completed · ${blocks.length} total blocks`, blocks.length && percentage(blockComplete.length, blocks.length) >= 70 ? "good" : "neutral"),
        metric("Routine follow-through", `${routineRate}%`, `${routineComplete} completed · ${routineOpen} open · ${routineSkipped} skipped`, routineRate >= 70 ? "good" : expectedRoutineOccurrences.length ? "warning" : "neutral"),
        metric("Open decisions", openActions.length, `${overdueGoals.length} outcomes past target`, overdueGoals.length ? "warning" : "neutral"),
      ],
      sections: [
        section("What is moving", [taskDone.length ? `${taskDone.length} project tasks are complete in the current portfolio.` : null, completedMilestones.length ? `${completedMilestones.length} milestones are complete.` : null, completedGoals.length ? `${completedGoals.length} LifeOS outcomes have been completed.` : null]),
        section("What needs attention", [blockedProjects.length ? `${blockedProjects.length} project${blockedProjects.length === 1 ? " is" : "s are"} blocked.` : null, overdueTasks.length ? `${overdueTasks.length} open project tasks are overdue.` : null, overdueMilestones.length ? `${overdueMilestones.length} milestones are overdue.` : null, overdueGoals.length ? `${overdueGoals.length} LifeOS outcomes are past target.` : null]),
        section("Recent learning", recentLessons.length ? recentLessons : ["No AAR lessons were recorded in this range."]),
      ],
      gaps: [!blocks.length ? "No calendar execution blocks exist in this period." : "", !reviews.length ? "No AARs were saved in this period." : "", !financialEvidence.length ? "No financial actuals are recorded yet." : ""].filter(Boolean),
      recommendations: [blockedProjects.length ? "Resolve or explicitly re-plan blocked projects before adding new commitments." : "Keep the active portfolio intentionally small.", overdueTasks.length ? "Review overdue tasks and either schedule, re-date, delegate, or close them." : "Continue linking project work to Calendar blocks.", "Use the AAR to explain misses instead of treating an unchecked item as self-explanatory."],
    };
  } else if (key === "TIME_EXECUTION") {
    result = { ...base,
      summary: `${hours(scheduledMilliseconds)} hours were scheduled in ${blocks.length} work blocks. ${hours(completedMilliseconds)} hours were completed, while recurring routines were completed at a ${routineRate}% rate.`,
      metrics: [metric("Scheduled hours", hours(scheduledMilliseconds), `${blocks.length} time blocks`), metric("Completed hours", hours(completedMilliseconds), `${blockComplete.length} completed blocks`, "good"), metric("Skipped blocks", blockSkipped.length, "Intentionally not completed", blockSkipped.length ? "warning" : "neutral"), metric("Routine rate", `${routineRate}%`, `${expectedRoutineOccurrences.length} expected occurrences`, routineRate >= 70 ? "good" : expectedRoutineOccurrences.length ? "warning" : "neutral")],
      sections: [section("Execution", [`${blockComplete.length} blocks completed; ${blocks.filter((block) => !["COMPLETED", "SKIPPED"].includes(block.status)).length} remain open or in progress.`, `${routineComplete} routine occurrences completed; ${routineOpen} remain unchecked.`]), section("Calendar sources", connectedFeeds.length ? connectedFeeds.map((feed) => `${feed.name}: ${feed.lastError ? `attention needed — ${feed.lastError}` : "connected"}`) : ["No public calendars are connected."])],
      gaps: [!blocks.length ? "No scheduled work blocks were found for the range." : "", !expectedRoutineOccurrences.length ? "No scheduled routines were expected in this range." : "", connectedFeeds.some((feed) => feed.lastError) ? "At least one public calendar feed has a refresh error." : ""].filter(Boolean),
      recommendations: ["Protect high-value work with linked Calendar blocks.", "Mark routines and work blocks complete, skipped, or reopened before the AAR.", "Compare completed hours with outcomes, not just hours scheduled."],
    };
  } else if (key === "AAR_LEARNING") {
    result = { ...base,
      summary: `${reviews.length} daily AAR${reviews.length === 1 ? " was" : "s were"} recorded, alongside ${reviewCycles.length} weekly, monthly, or quarterly review decisions.`,
      metrics: [metric("Daily AARs", reviews.length, `${percentage(reviews.length, Math.max(1, Math.ceil((range.endExclusive.valueOf() - range.start.valueOf()) / 86_400_000)))}% day coverage`), metric("Review decisions", reviewCycles.length, "Weekly, monthly, or quarterly"), metric("Completed agenda work", blockComplete.length + routineComplete, "Blocks and routine occurrences", "good"), metric("Open or skipped", blocks.length - blockComplete.length + routineOpen + routineSkipped, "Material for reflection", "warning")],
      sections: [section("Recorded lessons and next changes", recentLessons.length ? recentLessons : ["No lessons or next changes were recorded in this range."]), section("Execution evidence", [`${blockComplete.length} scheduled blocks completed and ${blockSkipped.length} skipped.`, `${routineComplete} routines completed, ${routineSkipped} skipped, and ${routineOpen} left open.`])],
      gaps: [!reviews.length ? "The period has no daily AAR evidence." : "", !reviewCycles.length ? "No higher-level review decision was recorded." : ""].filter(Boolean),
      recommendations: ["Record why important work was missed, not only that it was missed.", "Promote repeated AAR lessons into a system change or routine.", "Use one weekly decision to prevent review notes from becoming passive history."],
    };
  } else if (key === "PROJECTS") {
    result = { ...base,
      summary: `${activeProjects.length} projects are active, with ${openTasks.length} open tasks and ${milestones.filter((milestone) => !milestone.completedAt).length} open milestones.`,
      metrics: [metric("Active projects", activeProjects.length, `${projects.length - activeProjects.length} complete`), metric("Blocked", blockedProjects.length, "Projects needing intervention", blockedProjects.length ? "warning" : "good"), metric("Overdue tasks", overdueTasks.length, `${openTasks.length} open tasks`, overdueTasks.length ? "warning" : "good"), metric("Scheduled effort", `${hours(blocks.filter((block) => block.projectId).reduce((total, block) => total + block.endAt.valueOf() - block.startAt.valueOf(), 0))}h`, "Calendar blocks linked to projects")],
      sections: [section("At-risk projects", [...blockedProjects, ...overdueProjects.filter((project) => !blockedProjects.includes(project))].slice(0, 12).map((project) => `${project.name} · ${project.client.companyName || project.client.name} · ${project.status.toLowerCase().replaceAll("_", " ")}`)), section("Delivery evidence", [`${taskDone.length} of ${tasks.length} tracked tasks are done.`, `${completedMilestones.length} of ${milestones.length} milestones are complete.`, `${updates.length} project updates were recorded in this period.`])],
      gaps: [!projects.length ? "No projects exist." : "", activeProjects.some((project) => !project.targetDate) ? "Some active projects have no target date." : "", openTasks.some((task) => !task.dueDate) ? "Some open tasks have no due date." : ""].filter(Boolean),
      recommendations: [overdueTasks.length ? "Triage overdue tasks by re-dating, scheduling, delegating, or closing each one." : "Keep task due dates current.", blockedProjects.length ? "Record the blocking decision and owner for every blocked project." : "Continue watching for blockers.", "Link meaningful project sessions to Calendar so planned effort and delivered work can be compared."],
    };
  } else if (key === "CLIENTS") {
    const busiest = clients.map((client) => ({ client, counts: clientProjectCounts.get(client.id) ?? { active: 0, complete: 0 } })).sort((a, b) => b.counts.active - a.counts.active).slice(0, 12);
    result = { ...base,
      summary: `${clients.length} active client records support ${activeProjects.length} active projects. ${dormantClients.length} clients currently have no active project.`,
      metrics: [metric("Clients", clients.length, "Non-archived records"), metric("With active work", clients.length - dormantClients.length, `${activeProjects.length} active projects`), metric("Without active work", dormantClients.length, "Potential follow-up or intentional dormancy", dormantClients.length ? "warning" : "neutral"), metric("Client-visible updates", updates.filter((update) => update.clientVisible).length, "In the selected period")],
      sections: [section("Portfolio by client", busiest.map(({ client, counts }) => `${client.companyName || client.name}: ${counts.active} active · ${counts.complete} complete`)), section("Clients without active work", dormantClients.slice(0, 12).map((client) => client.companyName || client.name))],
      gaps: [!clients.length ? "No clients exist." : "", clients.some((client) => !client.companyName) ? "Some client records do not include a company name." : "", !updates.some((update) => update.clientVisible) ? "No client-visible updates were recorded in this period." : ""].filter(Boolean),
      recommendations: ["Review clients without active work and classify them as nurture, complete, or intentionally inactive.", "Use client-visible updates to keep delivery evidence current.", "Balance active project count against actual scheduled capacity."],
    };
  } else if (key === "ARANDMEDIA") {
    result = { ...base,
      summary: `ArandMedia is carrying ${activeProjects.length} active projects across ${clients.length - dormantClients.length} active client relationships, with ${updates.length} project updates during this period.`,
      metrics: [metric("Active projects", activeProjects.length, `${blockedProjects.length} blocked`, blockedProjects.length ? "warning" : "neutral"), metric("Open delivery tasks", openTasks.length, `${overdueTasks.length} overdue`, overdueTasks.length ? "warning" : "neutral"), metric("Portfolio completion", `${percentage(projects.length - activeProjects.length, projects.length)}%`, `${projects.length} total projects`), metric("Operating actions", arand.openActions.length, `${arand.activeRoutines.length} active routines`)],
      sections: [section("Operating state", [arand.state?.currentState ? `Current: ${arand.state.currentState}` : "Current operating state has not been established.", arand.state?.desiredState ? `Desired: ${arand.state.desiredState}` : "Desired operating state has not been established.", arand.state?.gap ? `Gap: ${arand.state.gap}` : null]), section("Portfolio pressure", [overdueTasks.length ? `${overdueTasks.length} overdue tasks require a decision.` : "No overdue tasks are recorded.", blockedProjects.length ? `${blockedProjects.length} blocked projects require intervention.` : "No projects are marked blocked.", `${updates.length} project updates were created in the selected range.`])],
      gaps: [!arand.state?.currentState ? "ArandMedia current state is blank." : "", !latestFinancial.length ? "No financial metrics are available for an operating margin or runway view." : "", !updates.length ? "No project updates were recorded in the range." : ""].filter(Boolean),
      recommendations: ["Set a capacity limit for simultaneous active projects.", "Review overdue delivery work before adding new commitments.", latestFinancial.length ? "Compare operating delivery with current financial measurements." : "Record revenue, expenses, cash, receivables, or runway as ArandMedia or Wealth metrics."],
    };
  } else if (key === "FINANCE") {
    result = { ...base,
      summary: latestFinancial.length ? `${latestFinancial.length} financial measurements are available for this period. The report only uses recorded actuals and does not infer revenue, profit, or cash from project activity.` : "LaunchPAD has project and client activity, but no recorded financial actuals in this period. It will not invent revenue, expenses, cash, profit, or receivables.",
      metrics: latestFinancial.length ? latestFinancial.slice(0, 8).map((entry) => metric(entry.name, `${oneDecimal.format(entry.value)}${entry.unit ? ` ${entry.unit}` : ""}`, `Recorded ${entry.observedAt.toISOString().slice(0, 10)}`)) : [metric("Financial actuals", 0, "No finance measurements recorded", "warning"), metric("Active projects", activeProjects.length, "Operational pipeline, not booked revenue"), metric("Active clients", clients.length - dormantClients.length, "Relationships with active projects"), metric("Overdue delivery", overdueTasks.length + overdueMilestones.length, "Potential collection and margin risk", overdueTasks.length + overdueMilestones.length ? "warning" : "neutral")],
      sections: [section("Recorded financial evidence", latestFinancial.length ? latestFinancial.map((entry) => `${entry.name}: ${oneDecimal.format(entry.value)}${entry.unit ? ` ${entry.unit}` : ""} on ${entry.observedAt.toISOString().slice(0, 10)}`) : ["No revenue, expense, cash, receivable, profit, margin, runway, debt, savings, or net-worth measurement was found."]), section("Operational context", [`${activeProjects.length} active projects across ${clients.length - dormantClients.length} active clients.`, `${overdueTasks.length} overdue tasks and ${overdueMilestones.length} overdue milestones may create delivery or collection risk.`, `${updates.length} project updates were recorded during the period.`])],
      gaps: [!financialEvidence.some((entry) => /revenue|income/i.test(entry.name)) ? "Revenue or income is not recorded." : "", !financialEvidence.some((entry) => /expense|cost/i.test(entry.name)) ? "Expenses or operating costs are not recorded." : "", !financialEvidence.some((entry) => /cash/i.test(entry.name)) ? "Cash on hand is not recorded." : "", !financialEvidence.some((entry) => /receivable/i.test(entry.name)) ? "Accounts receivable is not recorded." : ""].filter(Boolean),
      recommendations: ["Create Wealth or ArandMedia metrics for revenue, expenses, cash on hand, receivables, profit margin, and runway.", "Import monthly totals from a free CSV export before considering a paid accounting connection.", "Keep operational pipeline separate from booked revenue and collected cash."],
    };
  } else if (key === "HEALTH") {
    const grouped = new Map<string, number[]>();
    for (const entry of healthEvidence) grouped.set(entry.name, [...(grouped.get(entry.name) ?? []), entry.value]);
    const averages = [...grouped.entries()].map(([name, values]) => ({ name, value: average(values)! }));
    result = { ...base,
      summary: `${healthEvidence.length} encrypted health readings and ${expectedRoutineOccurrences.filter((occurrence) => occurrence.domainKey === "HEALTH").length} scheduled health-routine occurrences are available in this period.`,
      metrics: averages.length ? averages.slice(0, 8).map((entry) => metric(`Average ${entry.name}`, oneDecimal.format(entry.value), `${grouped.get(entry.name)!.length} readings`)) : [metric("Health readings", 0, "No manual check-ins in range", "warning"), metric("Active routines", health.activeRoutines.length, `${health.openGoals.length} active outcomes`), metric("Health actions", health.openActions.length, "Open next actions"), metric("Routine completion", `${routineRate}%`, "All scheduled routines in period")],
      sections: [section("Health system", [health.state?.currentState ? `Current: ${health.state.currentState}` : "Current health state has not been established.", health.state?.desiredState ? `Desired: ${health.state.desiredState}` : "Desired health state has not been established.", `${health.activeRoutines.length} health routines are active and ${health.openActions.length} health actions are open.`]), section("Recorded averages", averages.length ? averages.map((entry) => `${entry.name}: ${oneDecimal.format(entry.value)}`) : ["No health measurements were recorded for this range."])],
      gaps: [!healthEvidence.length ? "No encrypted health check-ins exist in this range." : "", !health.openGoals.length ? "No active health outcome is defined." : "", !health.activeRoutines.length ? "No active health routine is defined." : ""].filter(Boolean),
      recommendations: ["Compare sleep and recovery trends with routine completion rather than judging either in isolation.", "Use target dates on finishable health outcomes and keep routines ongoing.", "Record health data consistently enough to distinguish a trend from a single day."],
    };
  } else if (key === "WEALTH") {
    result = { ...base,
      summary: `${wealth.openGoals.length} Wealth outcomes, ${wealth.openActions.length} open actions, ${wealth.activeRoutines.length} active routines, and ${wealth.evidence.length} measurements are available.`,
      metrics: [metric("Active outcomes", wealth.openGoals.length, `${wealth.completedGoals.length} completed`), metric("Open actions", wealth.openActions.length, "One-time next steps"), metric("Active routines", wealth.activeRoutines.length, "Ongoing systems"), metric("Measurements", wealth.evidence.length, "Evidence in selected range")],
      sections: [section("Current direction", [wealth.state?.currentState ? `Current: ${wealth.state.currentState}` : "Current Wealth state has not been established.", wealth.state?.desiredState ? `Desired: ${wealth.state.desiredState}` : "Desired Wealth state has not been established.", wealth.state?.gap ? `Gap: ${wealth.state.gap}` : null]), section("Active outcomes", wealth.openGoals.slice(0, 12).map((goal) => goal.title))],
      gaps: [!wealth.state?.currentState ? "Wealth current state is blank." : "", !wealth.evidence.length ? "No Wealth measurements are recorded in this range." : "", !wealth.openGoals.length ? "No active Wealth outcome is defined." : ""].filter(Boolean),
      recommendations: ["Define a small set of financial and non-financial Wealth metrics.", "Separate one-time financial actions from ongoing Wealth routines.", "Review whether each active outcome has evidence and a next action."],
    };
  } else if (key === "RELATIONSHIPS") {
    result = { ...base,
      summary: `${commitments.length} active relationship commitments, ${relationships.activeRoutines.length} routines, and ${relationships.openActions.length} next actions are currently defined.`,
      metrics: [metric("Commitments", commitments.length, `${new Set(commitments.map((item) => item.area)).size} relationship areas`), metric("Active outcomes", relationships.openGoals.length, `${relationships.completedGoals.length} completed`), metric("Open actions", relationships.openActions.length, "One-time follow-through"), metric("Active routines", relationships.activeRoutines.length, "Recurring connection")],
      sections: [section("Active commitments", commitments.length ? commitments.map((item) => `${item.area}: ${item.title}${item.cadence ? ` · ${item.cadence}` : ""}`) : ["No active relationship commitments are recorded."]), section("Operating state", [relationships.state?.currentState ? `Current: ${relationships.state.currentState}` : "Current relationship state has not been established.", relationships.state?.desiredState ? `Desired: ${relationships.state.desiredState}` : "Desired relationship state has not been established."])],
      gaps: [!commitments.length ? "No explicit relationship commitments exist." : "", !relationships.activeRoutines.length ? "No recurring relationship routine is active." : "", !relationships.openGoals.length ? "No active relationship outcome is defined." : ""].filter(Boolean),
      recommendations: ["Use commitments for the relationships and behaviors you intend to protect.", "Use routines for recurring connection and actions for one-time repairs or setup.", "Review neglected relationship areas without reducing relationships to task completion alone."],
    };
  } else if (key === "SELF_PURPOSE") {
    const byKind = (kind: string) => principles.filter((principle) => principle.kind === kind);
    result = { ...base,
      summary: `${byKind("VALUE").length} values, ${byKind("CONVICTION").length} convictions, ${byKind("STRENGTH").length} strengths, and ${byKind("GROWTH_EDGE").length} growth edges form the current living self-profile.`,
      metrics: [metric("Values", byKind("VALUE").length, "Active and ranked"), metric("Convictions", byKind("CONVICTION").length, "Active and ranked"), metric("Strengths", byKind("STRENGTH").length, "Capabilities to leverage"), metric("Growth edges", byKind("GROWTH_EDGE").length, "Patterns to manage")],
      sections: [section("Highest-priority self-knowledge", principles.slice(0, 12).map((principle) => `${principle.kind.replaceAll("_", " ").toLowerCase()}: ${principle.title}${principle.why ? ` — ${principle.why}` : ""}`)), section("Purpose in action", [`${self.openGoals.length} active Self & Purpose outcomes.`, `${self.openActions.length} open next actions and ${self.activeRoutines.length} active routines.`])],
      gaps: [!principles.length ? "No self-profile knowledge is recorded." : "", !self.state?.desiredState ? "The ongoing desired state is blank." : "", !self.openGoals.length ? "No finishable Self & Purpose outcome is active." : ""].filter(Boolean),
      recommendations: ["Use strengths deliberately instead of only documenting them.", "Pair each important growth edge with a system, boundary, or routine.", "Revisit importance rankings annually or after a major life change."],
    };
  } else if (key === "OMNIS") {
    const connected = omnis.goals.filter((goal) => goal.parentId);
    const types = new Map<string, number>();
    for (const goal of omnis.goals) types.set(goal.nodeType, (types.get(goal.nodeType) ?? 0) + 1);
    result = { ...base,
      summary: `${omnis.goals.length} Operation Omnis pinpoints are mapped; ${connected.length} are explicitly connected to a parent and ${omnis.openGoals.length} remain active.`,
      metrics: [metric("Pinpoints", omnis.goals.length, `${omnis.openGoals.length} active`), metric("Connected", `${percentage(connected.length, omnis.goals.length)}%`, `${connected.length} with a parent link`), metric("Brands", types.get("BRAND") ?? 0, "Brand pinpoints"), metric("Past target", omnis.openGoals.filter((goal) => goal.targetDate && goal.targetDate < today).length, "Active pinpoints needing review")],
      sections: [section("Map composition", [...types.entries()].map(([type, count]) => `${type.toLowerCase().replaceAll("_", " ")}: ${count}`)), section("Active mission work", omnis.openGoals.slice(0, 15).map((goal) => `${goal.title} · ${goal.horizon.toLowerCase()}${goal.purpose ? ` · ${goal.purpose}` : ""}`))],
      gaps: [!omnis.goals.length ? "The mission map has no pinpoints." : "", omnis.goals.some((goal) => !goal.purpose) ? "Some pinpoints do not explain why they matter." : "", omnis.goals.some((goal) => !goal.parentId && goal.horizon !== "LIFETIME") ? "Some pinpoints are not connected to the North Star." : ""].filter(Boolean),
      recommendations: ["Keep each pinpoint explicit about the necessity it serves and why it matters.", "Connect brands and programs to the North Star instead of leaving parallel initiatives.", "Use target dates selectively where time pressure is real."],
    };
  } else {
    const staleFeeds = calendarFeeds.filter((feed) => feed.lastError);
    const filledDomains = domains.filter((domain) => domain.currentState || domain.desiredState || domain.gap);
    result = { ...base,
      summary: `LaunchPAD currently draws from ${sourceNames.length} internal or connected source groups. ${filledDomains.length} of 6 LifeOS domains have operating-state content, and ${connectedFeeds.length} public calendars are active.`,
      metrics: [metric("Report types", REPORT_KEYS.length, "Available now"), metric("LifeOS domains", `${filledDomains.length}/6`, "With operating-state content"), metric("Public calendars", connectedFeeds.length, `${staleFeeds.length} with errors`, staleFeeds.length ? "warning" : "neutral"), metric("Other connections", connectedIntegrations.length, "Authorized integrations")],
      sections: [section("Available evidence", sourceNames), section("Free-source opportunities", ["Public iCalendar feeds for read-only schedule context.", "CSV exports for finance, accounting, and historical measurements.", "Approved public datasets for economic, demographic, weather, or industry context.", "Manual measurements when a secure automated connection would add cost or unnecessary access."])],
      gaps: [!healthEvidence.length ? "Health reports have no readings in this range." : "", !latestFinancial.length ? "Finance reports have no recorded actuals." : "", !reviews.length ? "Learning reports have no AARs in this range." : "", staleFeeds.length ? `${staleFeeds.length} public calendar feed${staleFeeds.length === 1 ? " has" : "s have"} a refresh error.` : ""].filter(Boolean),
      recommendations: ["Add only sources that answer a recurring decision, not data for its own sake.", "Prefer free exports and public feeds before paid integrations.", "Keep sensitive health and financial evidence owner-only and clearly labeled by source."],
    };
  }

  return NextResponse.json({ report: result }, { headers: { "Cache-Control": "private, no-store" } });
}
