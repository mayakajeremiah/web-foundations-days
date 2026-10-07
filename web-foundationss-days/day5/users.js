const loadButton = document.querySelector("#load-users");
const filterInput = document.querySelector("#filter-input");
const status = document.querySelector("#status");
const usersList = document.querySelector("#users-list");

let users = [];


async function loadUsers() {
    loadButton.disabled = true;
    status.textContent = "Loading users...";
    usersList.textContent = "";

    try {
        const response = await fetch(
            "https://jsonplaceholder.typicode.com/users"
        );

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        users = await response.json();

        renderUsers(users);

        status.textContent = `Loaded ${users.length} users.`;

    } catch (error) {
        status.textContent = "Failed to load users.";
        console.error("Error:", error);

    } finally {
        loadButton.disabled = false;
    }
}


function renderUsers(list) {
    usersList.textContent = "";

    if (list.length === 0) {
        const message = document.createElement("li");
        message.textContent = "No users match your filter.";
        usersList.appendChild(message);
        return;
    }

    list.forEach((user) => {
        const listItem = document.createElement("li");

        const name = document.createElement("h2");
        name.textContent = user.name;

        const email = document.createElement("p");
        email.textContent = `Email: ${user.email}`;

        const city = document.createElement("p");
        city.textContent = `City: ${user.address.city}`;

        const company = document.createElement("p");
        company.textContent = `Company: ${user.company.name}`;

        listItem.append(name, email, city, company);

        usersList.appendChild(listItem);
    });
}


filterInput.addEventListener("input", () => {
    const searchText = filterInput.value.trim().toLowerCase();

    const filteredUsers = users.filter((user) =>
        user.name.toLowerCase().includes(searchText)
    );

    renderUsers(filteredUsers);
});


loadButton.addEventListener("click", loadUsers);