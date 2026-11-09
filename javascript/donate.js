const form = document.querySelector( 'form' )

form.onsubmit = async ( e ) => {
    e.preventDefault()


    const name = document.getElementById( 'name' ).value.trim(),
        email = document.getElementById( 'email' ).value.trim(),
        number = document.getElementById( 'number' ).value.trim(),
        amount = document.getElementById( 'amount' ).value.trim(),
        donation = document.getElementById( 'donation-type' ).value,
        error = document.querySelector( '.error' )
    let regex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/

    if ( name.length < 3 ) {
        error.innerHTML = 'Please enter name field properly'
        return
    } else if ( !regex.test( email ) ) {
        error.innerHTML = 'Please enter email field properly'
        return
    } else if ( number.length != 12 ) {
        error.innerHTML = 'Please enter valid phone number '
        return
    } else {
        error.innerHTML = ''
    }

    const response = await fetch( '/checkout', {
        method: 'post',
        body: JSON.stringify( {
            name, email, number, amount, donation
        } ),
        headers: {
            'Content-Type': 'application/json'
        }
    } )

    let result = await response.json()

    const options = {
        key: result.key,
        amount: result.amount,
        currency: 'INR',
        name: result.name,
        description: result.description,
        image: '../images/logo.png',
        order_id: result.id,
        handler: ( response ) => {
            const paymentId = response.razorpay_payment_id;
            const orderId = response.razorpay_order_id;
            const signature = response.razorpay_signature;

            fetch( '/verify-payment', {
                method: 'post',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify( { paymentId, orderId, signature, amount } )
            } ).then( response => {
                return response.json()
            } ).then( response => {
                if ( response.message == 'success' ) {
                    fetch( '/success', {
                        method: 'post',
                        body: JSON.stringify( {
                            name: result.name,
                            description: result.description,
                            order_id: result.id,
                            amount: result.amount / 100,
                            unixTime: result.created_at
                        } )
                    } )
                    window.location.href = `/success?name=${ result.name }&description=${ result.description }&order_id=${ result.id }&amount=${ result.amount / 100 }&unixTime=${ result.created_at }`
                } else {
                    window.location.href = '/failure'
                }
            } )
        },
        modal: {
            ondismiss: function () {
                window.location.href = '/failure'
            }
        },
        prefil: {
            name: result.name,
            email: result.email,
            contact: result.contact
        },
        theme: {
            color: "#00d999"
        }
    }

    const razorpay = new Razorpay( options )
    razorpay.open()

    // razorpay.on( 'payment.failed', function ( response ) { // it occurs when the international trasaction is created using card
    //    alert( 'International transactions are not allowed' )
    //   alert( response.error.code );
    //   alert( response.error.description );
    //   alert( response.error.source );
    //   alert( response.error.step );
    //   alert( response.error.reason );
    //   alert( response.error.metadata.order_id );
    //   alert( response.error.metadata.payment_id );
    // } );

}
