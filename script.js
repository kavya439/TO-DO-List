const taskInput = document.getElementById('taskInput');
const addBtn = document.getElementById('addBtn');
const taskList = document.getElementById('taskList');
const progressFill = document.getElementById('progress-fill');
const percentageText = document.getElementById('percentage');

function updateProgress() {
    const items = document.querySelectorAll('.task-item:not(.removing)');
    const checked = document.querySelectorAll('.task-checkbox:checked');
    
    let percent = 0;
    if (items.length > 0) {
        percent = Math.round((checked.length / items.length) * 100);
    }
    
    progressFill.style.width = percent + '%';
    percentageText.textContent = percent + '%';
}

function addTask(text) {
    if (text.trim() === "") return;

    const div = document.createElement('div');
    div.className = 'task-item';
    
    div.innerHTML = `
        <label style="display:flex; align-items:center; flex-grow:1; cursor:pointer;">
            <input type="checkbox" class="task-checkbox">
            <span class="custom-circle"></span>
            <span class="task-text">${text}</span>
        </label>
        <button class="delete-btn">×</button>
    `;

    // Toggle check
    div.querySelector('.task-checkbox').addEventListener('change', updateProgress);

    // Delete Logic
    div.querySelector('.delete-btn').addEventListener('click', () => {
        div.classList.add('removing');
        // Wait for animation to finish before removing from DOM
        setTimeout(() => {
            div.remove();
            updateProgress();
        }, 300);
    });
    
    taskList.appendChild(div);
    updateProgress();
}

addBtn.addEventListener('click', () => {
    addTask(taskInput.value);
    taskInput.value = "";
});

taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTask(taskInput.value);
        taskInput.value = "";
    }
});

// Initial Tasks
["🍉 Eat a watermelon", "🛁 Take a warm bath", "☀️ Sit in a sunny spot for 10 minutes"].forEach(t => addTask(t));