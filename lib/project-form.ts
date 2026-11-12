const textField = (form: HTMLFormElement, name: string) => {
  const control = form.elements.namedItem(name);
  if (!control || !("value" in control) || typeof control.value !== "string") return "";
  return control.value.replace(/\u0000/g, "");
};

export function readProjectForm(form: HTMLFormElement) {
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
