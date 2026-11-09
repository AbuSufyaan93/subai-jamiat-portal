( function () {
    'use strict'

    const questions = document.querySelectorAll( '.questionContainer .question-wrapper' )
    const nextBtns = document.querySelectorAll( '.questionContainer .question-wrapper .next-btn' )
    const time = document.querySelectorAll( '.questionContainer .quiz-header .quiz-time' )
    const form = document.querySelector( 'form.questionContainer' )
    const startBtn = document.querySelector( '.start-btn' )

    form.onsubmit = async ( e ) => {
        e.preventDefault();
        let formData = new FormData( form )

        let data = {};
        for ( let [ key, value ] of formData.entries() ) {
            data[ key ] = value
        }

        let ActualQuizData = {
            quizId: document.querySelector( '[data-quizId]' ).getAttribute( 'data-quizId' ),
            data: data
        }

        const request = await fetch( '/save-quiz-data', {
            method: "post",
            body: JSON.stringify( ActualQuizData ),
            headers: {
                'Content-Type': 'application/json'
            }
        } )

        const response = await request.json()
        if ( response.status == "success" ) {
            if ( response.isLoggedIn == true ) {
                location.href = "/quiz-result";
            } else {
                location.href = "/quiz-registeration";
            }
        } else {
            location.reload()
        }

    }

    startBtn.onclick = () => {
        startBtn.parentElement.style.display = 'none'
        form.classList.add( 'active' )
        questions[ 0 ].classList.add( 'active' )
        startQuiz( 0 )
    }


    nextBtns.forEach( ( btn, index ) => {
        btn.onclick = () => {

            try {
                //error occuring when clicking the next btn of the last question because we don't have a time in it
                //this error occurs in startQuiz Method
                questions[ index ].classList.remove( 'active' )
                questions[ index + 1 ].classList.add( 'active' )

                startQuiz( index + 1 )
            } catch ( error ) {

                // console.log("form is visibled")

            }

        }
    } )


    //with second
    function startQuiz ( questionIndex ) {

        // let minute = time[ questionIndex ].querySelector( '.minute' )
        let second = time[ questionIndex ].querySelector( '.second' )

        // console.log( minute, second )

        // let TimerStartMinute = parseInt( questions[ questionIndex ].getAttribute( 'data-minute' ) )
        let TimerStartSecond = parseInt( questions[ questionIndex ].getAttribute( 'data-second' ) )

        // minute.innerText = TimerStartMinute
        second.innerText = TimerStartSecond

        let timerInterval = setInterval( () => {

            if ( !questions[ questionIndex ].classList.contains( 'active' ) ) {
                clearInterval( timerInterval )
            }

            // let nextMinute;
            let nextSecond;

            // if ( minute.innerText == 0 && second.innerText == 0 ) {
            if ( second.innerText == 0 ) {

                clearInterval( timerInterval )

                if ( questionIndex == questions.length - 1 ) {

                    form.submit()

                } else {

                    nextBtns[ questionIndex ].click()

                }


            } else {

                if ( second.innerText != 0 ) {

                    nextSecond = --second.innerText

                }

                // else {

                //     if ( minute.innerText != 0 ) {

                //         nextMinute = --minute.innerText
                //         nextSecond = 59

                //     }
                // }

            }

            // nextMinute = ( nextMinute < 10 ) ? '0' + nextMinute : nextMinute
            nextSecond = ( nextSecond < 10 ) ? '0' + nextSecond : nextSecond

            // if ( nextMinute ) {
            //     minute.innerText = nextMinute
            // }

            if ( nextSecond ) {

                second.innerText = nextSecond

            }

        }, 1000 )

    }

    /*

    let allOptionInputs = document.querySelectorAll( '.questionContainer .options input[type=radio]' )
    let allOptions = document.querySelectorAll( '.questionContainer .options' )


     allOptionInputs.forEach( input => {

        input.onchange = ( e ) => {

            let li = e.target.parentElement.parentElement
            allOptions.forEach( option => {
                if ( option.contains( li ) ) {

                    let nextBtn = option.parentElement.querySelector( '.next-btn-container button' )

                    if ( nextBtn != null ) {

                        nextBtn.click();

                    } else {

                        let submitBtn = option.parentElement.querySelector( '.submit-btn' )
                        submitBtn.click();

                        //not working don't know why (tried to many times and from to many ways)
                        // let AllChilds = option.getElementsByTagName('li')
                        // Array.from(AllChilds).forEach(child =>{
                        //     if(child.classList.contains('active')){
                        //         child.classList.remove('active')
                        //     }
                        // })
                        // li.classList.add('acitve')

                    }

                }
            } )

        }

    } )


     //start quiz method with minute
    // function startQuiz ( questionIndex ) {

    //     let minute = time[ questionIndex ].querySelector( '.minute' )
    //     let second = time[ questionIndex ].querySelector( '.second' )

    //     // console.log( minute, second )

    //     let TimerStartMinute = parseInt( questions[ questionIndex ].getAttribute( 'data-minute' ) )
    //     let TimerStartSecond = parseInt( questions[ questionIndex ].getAttribute( 'data-second' ) )

    //     minute.innerText = TimerStartMinute
    //     second.innerText = TimerStartSecond

    //     let timerInterval = setInterval( () => {

    //         if ( !questions[ questionIndex ].classList.contains( 'active' ) ) {
    //             clearInterval( timerInterval )
    //         }

    //         let nextMinute;
    //         let nextSecond;

    //         if ( minute.innerText == 0 && second.innerText == 0 ) {

    //             clearInterval( timerInterval )

    //             if ( questionIndex == questions.length - 1 ) {

    //                 form.submit()

    //             } else {

    //                 nextBtns[ questionIndex ].click()

    //             }


    //         } else {

    //             if ( second.innerText != 0 ) {

    //                 nextSecond = --second.innerText

    //             } else {

    //                 if ( minute.innerText != 0 ) {

    //                     nextMinute = --minute.innerText
    //                     nextSecond = 59

    //                 }
    //             }

    //         }

    //         nextMinute = ( nextMinute < 10 ) ? '0' + nextMinute : nextMinute
    //         nextSecond = ( nextSecond < 10 ) ? '0' + nextSecond : nextSecond

    //         if ( nextMinute ) {
    //             minute.innerText = nextMinute
    //         }

    //         if ( nextSecond ) {

    //             second.innerText = nextSecond

    //         }

    //     }, 1000 )

    // }


    */
} )();