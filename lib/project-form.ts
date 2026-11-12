const textField = (form: FormData, name: string) => {
  const value = form.get(name);
  return typeof value === "string" ? value.replaceAll("\u0000", "") : "";
};

export function readProjectForm(form: FormData) {
  return {
    name: textField(form, "name").trim(),
    description: textField(form, "description"),
    problem: textField(form, "problem"),
    solution: textField(form, "solution"),
    desiredOutcome: textField(form, "desiredOutcome"),
    status: textField(form, "status"),
    startDate: textField(form, "startDate") || null,
    targetDate: textField(form, "targetDate") || null,
  };
}
