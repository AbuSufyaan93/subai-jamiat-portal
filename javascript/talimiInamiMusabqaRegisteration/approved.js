const approveBtns = document.querySelectorAll('.approve-btn')

approveBtns.forEach(btn => {
    btn.onclick = async () => {
        document.body.style.cursor = 'wait'

        let id = btn.getAttribute('data-id')
        try {
            let request = await fetch('/musabqa-generate-pdf', {
                method: 'post',
                body: JSON.stringify({
                    id: id
                }),
                headers: {
                    'content-type': 'application/json'
                }
            })

            let response = await request.json()

            if (response.status === 'limit_warning') {
                document.body.style.cursor = 'default'
                const proceed = confirm(response.message)
                if (proceed) {
                    document.body.style.cursor = 'wait'
                    let forceRequest = await fetch('/musabqa-generate-pdf', {
                        method: 'post',
                        body: JSON.stringify({
                            id: id,
                            forceApprove: true
                        }),
                        headers: {
                            'content-type': 'application/json'
                        }
                    })

                    let forceResponse = await forceRequest.json()
                    if (forceResponse.status === 'success') {
                        window.open(`https://wa.me/+91${forceResponse.to.phone}?text=${forceResponse.to.message}%0A${forceResponse.to.QrURL}`)
                        location.reload()
                    } else {
                        alert(forceResponse.message || 'Error approving candidate')
                        document.body.style.cursor = 'default'
                    }
                }
                return
            }

            if (response.status === 'success') {
                window.open(`https://wa.me/+91${response.to.phone}?text=${response.to.message}%0A${response.to.QrURL}`)
                location.reload()
            } else if (response.status === 'error') {
                document.body.style.cursor = 'default'
                alert(response.message || 'Error processing approval')
            }
        } catch (err) {
            console.error('Approve error:', err)
            document.body.style.cursor = 'default'
            alert('Something went wrong. Please try again.')
        }
    }
})