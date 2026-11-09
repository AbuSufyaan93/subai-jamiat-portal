const deleteBtns = document.querySelectorAll('.delete-btn')

deleteBtns.forEach(btn => {
    btn.onclick = async () => {
        const confirmDelete = confirm('کیا آپ واقعی اس امیدوار کے ڈیٹا کو مکمل طور پر ڈیلیٹ کرنا چاہتے ہیں؟\n\n(Are you sure you want to permanently delete this candidate?)')
        if (!confirmDelete) return

        document.body.style.cursor = 'wait'
        let id = btn.getAttribute('data-id')
        try {
            let request = await fetch('/musabqa-delete', {
                method: 'post',
                body: JSON.stringify({ id: id }),
                headers: { 'content-type': 'application/json' }
            })
            let response = await request.json()
            if (response.status === 'success') {
                location.reload()
            } else {
                alert(response.message || 'Error deleting record')
                document.body.style.cursor = 'default'
            }
        } catch (err) {
            console.error('Delete error:', err)
            alert('Something went wrong. Please try again.')
            document.body.style.cursor = 'default'
        }
    }
})
