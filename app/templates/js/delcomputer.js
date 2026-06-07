// ---
// Delete Computer
let deleteForm;

function setDeleteForm(action, name, value, message) {
  // Store the form element in a variable
  deleteForm = document.createElement('form');
  deleteForm.method = 'POST';
  deleteForm.action = action;

  // Create a hidden input
  const input = document.createElement('input');
  input.type = 'hidden';
  input.name = name;
  input.value = value;

  // Append the input to the form
  deleteForm.appendChild(input);

  document.getElementById('deleteMessage').textContent = message;
}

document.getElementById('confirmDelete').addEventListener('click', function() {
  if (deleteForm) {
    document.body.appendChild(deleteForm);
    deleteForm.submit();
  }
});

document.addEventListener('DOMContentLoaded', function () {
  const deleteModal = document.getElementById('staticDelete');
  if (deleteModal) {
    deleteModal.addEventListener('show.bs.modal', function (event) {
      const button = event.relatedTarget; // Button that triggered the modal
      const action = button.getAttribute('data-action');
      const name = button.getAttribute('data-name');
      const value = button.getAttribute('data-value');
      const message = button.getAttribute('data-message');
      setDeleteForm(action, name, value, message);
    });
  }
});
