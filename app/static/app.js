const rowsElement = document.querySelector("#student-rows");
const tableState = document.querySelector("#table-state");
const dialog = document.querySelector("#student-dialog");
const form = document.querySelector("#student-form");
const searchInput = document.querySelector("#search-input");
const courseFilter = document.querySelector("#course-filter");
const toast = document.querySelector("#toast");

let students = [];
let toastTimeout;

const moneyFormat = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

async function request(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = typeof body.detail === "string" ? body.detail : "Please check the entered information.";
    throw new Error(message);
  }

  return response.status === 204 ? null : response.json();
}

async function fetchAllStudents() {
  const pageSize = 100;
  const records = [];
  let offset = 0;

  while (true) {
    const page = await request(`/students?offset=${offset}&limit=${pageSize}`);
    records.push(...page);
    if (page.length < pageSize) return records;
    offset += pageSize;
  }
}

function showToast(message) {
  clearTimeout(toastTimeout);
  toast.textContent = message;
  toast.classList.add("is-visible");
  toastTimeout = setTimeout(() => toast.classList.remove("is-visible"), 3000);
}

function setTableMessage(title, message, isError = false) {
  rowsElement.replaceChildren();
  tableState.hidden = false;
  tableState.classList.toggle("is-error", isError);
  tableState.innerHTML = "";

  if (!isError) {
    const mark = document.createElement("span");
    mark.className = "empty-mark";
    mark.setAttribute("aria-hidden", "true");
    mark.textContent = title === "Gathering the directory" ? "" : "+";
    tableState.append(mark);
  }

  const heading = document.createElement("strong");
  heading.textContent = title;
  const detail = document.createElement("span");
  detail.textContent = message;
  tableState.append(heading, detail);
}

function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function makeIconButton(label, iconName, studentId, className = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `icon-button ${className}`.trim();
  button.setAttribute("aria-label", `${label} student`);
  button.title = `${label} student`;
  button.dataset.action = label.toLowerCase();
  button.dataset.id = studentId;
  const paths = iconName === "edit"
    ? '<path d="m14.5 5.5 4 4M4 20l4.3-.9L19 8.4a2.1 2.1 0 0 0-3-3L5.3 16.1 4 20Z" />'
    : '<path d="M4 7h16M9 7V4h6v3m3 0-.8 13H6.8L6 7m4 4v5m4-5v5" />';
  button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
  return button;
}

function createStudentRow(student, index) {
  const row = document.createElement("tr");
  row.style.animationDelay = `${Math.min(index, 12) * 22}ms`;

  const identityCell = document.createElement("td");
  const identity = document.createElement("div");
  identity.className = "student-cell";
  const avatar = document.createElement("span");
  avatar.className = "student-avatar";
  avatar.setAttribute("aria-hidden", "true");
  avatar.textContent = initials(student.name);
  const copy = document.createElement("span");
  copy.className = "student-copy";
  const name = document.createElement("span");
  name.className = "student-name";
  name.textContent = student.name;
  const email = document.createElement("span");
  email.className = "student-email";
  email.textContent = student.email;
  copy.append(name, email);
  identity.append(avatar, copy);
  identityCell.append(identity);

  const courseCell = document.createElement("td");
  const course = document.createElement("span");
  course.className = "course-name";
  const courseDot = document.createElement("span");
  courseDot.className = "course-dot";
  courseDot.setAttribute("aria-hidden", "true");
  const courseText = document.createElement("span");
  courseText.textContent = student.course;
  course.append(courseDot, courseText);
  courseCell.append(course);

  const feesCell = document.createElement("td");
  feesCell.className = "fee-value";
  feesCell.textContent = moneyFormat.format(Number(student.fees));

  const actionsCell = document.createElement("td");
  const actions = document.createElement("span");
  actions.className = "row-actions";
  actions.append(makeIconButton("Edit", "edit", student.id), makeIconButton("Delete", "delete", student.id, "delete-button"));
  actionsCell.append(actions);

  row.append(identityCell, courseCell, feesCell, actionsCell);
  return row;
}

function render() {
  const search = searchInput.value.trim().toLocaleLowerCase();
  const selectedCourse = courseFilter.value;
  const filtered = students.filter((student) => {
    const matchesSearch = `${student.name} ${student.email} ${student.course}`.toLocaleLowerCase().includes(search);
    return matchesSearch && (!selectedCourse || student.course === selectedCourse);
  });

  document.querySelector("#total-students").textContent = String(students.length);
  document.querySelector("#sidebar-count").textContent = String(students.length);
  document.querySelector("#total-fees").textContent = moneyFormat.format(students.reduce((sum, student) => sum + Number(student.fees), 0));
  document.querySelector("#total-courses").textContent = String(new Set(students.map((student) => student.course)).size);
  document.querySelector("#result-count").textContent = String(filtered.length);
  document.querySelector("#footer-count").textContent = `Showing ${filtered.length} of ${students.length} student${students.length === 1 ? "" : "s"}`;

  const courses = [...new Set(students.map((student) => student.course))].sort((a, b) => a.localeCompare(b));
  const previousCourse = courseFilter.value;
  courseFilter.replaceChildren(new Option("All courses", ""));
  for (const course of courses) courseFilter.add(new Option(course, course));
  courseFilter.value = courses.includes(previousCourse) ? previousCourse : "";

  if (students.length === 0) {
    setTableMessage("No students yet", "Add a student to start building your directory.");
    return;
  }
  if (filtered.length === 0) {
    setTableMessage("No matching students", "Try a different search or course filter.");
    return;
  }

  tableState.hidden = true;
  tableState.classList.remove("is-error");
  rowsElement.replaceChildren(...filtered.map(createStudentRow));
}

async function refreshStudents() {
  try {
    students = await fetchAllStudents();
    render();
  } catch (error) {
    setTableMessage("Couldn't load students", error.message || "Check the API connection and try again.", true);
  }
}

function openDialog(student = null) {
  form.reset();
  document.querySelector("#form-error").textContent = "";
  document.querySelector("#student-id").value = student?.id ?? "";
  document.querySelector("#dialog-title").textContent = student ? "Edit student" : "Add a student";
  document.querySelector("#save-student-button").textContent = student ? "Save changes" : "Save student";
  if (student) {
    document.querySelector("#student-name").value = student.name;
    document.querySelector("#student-email").value = student.email;
    document.querySelector("#student-course").value = student.course;
    document.querySelector("#student-fees").value = Number(student.fees).toFixed(2);
  }
  dialog.showModal();
  document.querySelector("#student-name").focus();
}

function closeDialog() {
  dialog.close();
}

document.querySelector("#add-student-button").addEventListener("click", () => openDialog());
document.querySelector("#close-dialog").addEventListener("click", closeDialog);
document.querySelector("#cancel-dialog").addEventListener("click", closeDialog);
searchInput.addEventListener("input", render);
courseFilter.addEventListener("change", render);

dialog.addEventListener("click", (event) => {
  if (event.target === dialog) closeDialog();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const studentId = document.querySelector("#student-id").value;
  const payload = {
    name: document.querySelector("#student-name").value.trim(),
    email: document.querySelector("#student-email").value.trim(),
    course: document.querySelector("#student-course").value.trim(),
    fees: document.querySelector("#student-fees").value,
  };
  const saveButton = document.querySelector("#save-student-button");
  const errorElement = document.querySelector("#form-error");
  saveButton.disabled = true;
  saveButton.textContent = "Saving...";
  errorElement.textContent = "";

  try {
    await request(studentId ? `/students/${studentId}` : "/students", {
      method: studentId ? "PUT" : "POST",
      body: JSON.stringify(payload),
    });
    closeDialog();
    await refreshStudents();
    showToast(studentId ? "Student details updated." : "Student added to the directory.");
  } catch (error) {
    errorElement.textContent = error.message || "Could not save this student. Try again.";
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = studentId ? "Save changes" : "Save student";
  }
});

rowsElement.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const student = students.find((record) => String(record.id) === button.dataset.id);
  if (!student) return;

  if (button.dataset.action === "edit") {
    openDialog(student);
    return;
  }

  if (!window.confirm(`Delete ${student.name} from the directory? This cannot be undone.`)) return;
  button.disabled = true;
  try {
    await request(`/students/${student.id}`, { method: "DELETE" });
    await refreshStudents();
    showToast("Student removed from the directory.");
  } catch (error) {
    button.disabled = false;
    showToast(error.message || "Could not delete this student.");
  }
});

refreshStudents();