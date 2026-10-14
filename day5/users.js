const loadUsersButton = document.querySelector("#load-users");
const filterInput = document.querySelector("#filter-input");
const status = document.querySelector("#status");
const usersList = document.querySelector("#users-list");

let users = [];

function renderUsers(list) {
  usersList.textContent = "";

  if (list.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.textContent = "No users match your filter.";
    usersList.append(emptyItem);
    return;
  }

  for (const user of list) {
    const item = document.createElement("li");
    const name = document.createElement("h2");
    const email = document.createElement("p");
    const city = document.createElement("p");
    const company = document.createElement("p");

    name.textContent = user.name;
    email.textContent = `Email: ${user.email}`;
    city.textContent = `City: ${user.address.city}`;
    company.textContent = `Company: ${user.company.name}`;

    item.append(name, email, city, company);
    usersList.append(item);
  }
}

async function loadUsers() {
  loadUsersButton.disabled = true;
  status.textContent = "Loading users...";

  try {
    const response = await fetch("https://jsonplaceholder.typicode.com/users");

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    users = await response.json();
    renderUsers(users);
    status.textContent = `Loaded ${users.length} users.`;
  } catch (error) {
    users = [];
    usersList.textContent = "";
    status.textContent = `Could not load users: ${error.message}`;
  } finally {
    loadUsersButton.disabled = false;
  }
}

loadUsersButton.addEventListener("click", loadUsers);

filterInput.addEventListener("input", () => {
  const searchText = filterInput.value.toLowerCase();
  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchText),
  );

  renderUsers(filteredUsers);
});
