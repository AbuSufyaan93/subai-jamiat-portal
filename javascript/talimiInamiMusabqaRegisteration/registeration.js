const form = document.forms[0]
const image = document.querySelector('input[name=image]')
const file = document.querySelector('input[name=file]')
const number = document.querySelector('input[name=number]')
const popupContainer = document.querySelector('.popup-container')
const submit = document.querySelector('form .submit-container .submit')
const adharNo = document.querySelector("input[name=adharNo]")
const certificateNameInput = document.querySelector('#certificateName')
const loading = document.querySelector('form .data-loading')
const error = document.querySelector('.error')
const success = document.querySelector('.success')
const institutionInput = document.querySelector('#masjid_name_address')
const institutionList = document.querySelector('#institutionsList')
const districtInput = document.querySelector('#district')
const nameInput = document.querySelector('#name')
const categorySelect = document.querySelector('select[name=category]')

const districtContainer = document.querySelector('#districtContainer')
const districtSelect = document.querySelector('#districtSelect')
const masjidSelect = document.querySelector('#masjidSelect')
const nameSelect = document.querySelector('#nameSelect')

let institutionsData = []
let mutoonData = []
let sharahData = []

function normalizeMasjid(str) {
    if (!str) return ''
    return String(str)
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .replace(/[\u00A0]/g, ' ')
        .replace(/[,،]/g, '،')
        .replace(/\s*،\s*/g, '، ')
        .replace(/\s+/g, ' ')
        .trim()
}

function sanitizeDistrict(text) {
    if (!text) return ''
    return String(text)
        .replace(/[\(\[\{]\s*\d+\s*[\)\]\}]/g, '')
        .replace(/^\s*حلقہ\s*[\/،,\-]\s*ضلعی?\s*جمعیت\s*[:：\-]?\s*/gi, '')
        .replace(/^\s*حلقہ\s*[:：\-]?\s*/gi, '')
        .replace(/^[،,\s:：\-]+|[،,\s:：\-]+$/g, '')
        .replace(/\s*[،,]\s*/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

function getCategoryType(catVal) {
    if (!catVal) return 'madaris'
    if (catVal.includes('متون')) return 'mutoon'
    if (catVal.includes('شرح') || catVal.includes('العقیدۃ') || catVal.includes('العقيدة')) return 'sharah'
    return 'madaris'
}

async function loadData() {
    try {
        const [instRes, mutoonRes, sharahRes] = await Promise.all([
            fetch('/musabqa-institutions-data'),
            fetch('/musabqa-mutoon-data'),
            fetch('/musabqa-sharah-data')
        ])
        institutionsData = await instRes.json()
        mutoonData = await mutoonRes.json()
        sharahData = await sharahRes.json()

        updateCategoryFields(false)
    } catch (error) {
        console.log('Unable to load category data', error)
    }
}

function updateCategoryFields(shouldClearInputs = true) {
    const selectedCategory = categorySelect ? categorySelect.value : ''
    const catType = getCategoryType(selectedCategory)

    if (shouldClearInputs) {
        if (districtInput) districtInput.value = ''
        if (institutionInput) institutionInput.value = ''
        if (number) number.value = ''
        if (nameInput) nameInput.value = ''
        if (districtSelect) districtSelect.value = ''
        if (masjidSelect) masjidSelect.innerHTML = '<option value="">-- منتخب کریں --</option>'
        if (nameSelect) nameSelect.innerHTML = '<option value="">-- پہلے مسجد منتخب کریں --</option>'
    }

    if (catType === 'mutoon' || catType === 'sharah') {
        // Aimma Categories: Show strict dropdowns for Halqa, Masjid, and Imam Name
        if (districtContainer) districtContainer.style.display = 'block'
        if (districtSelect) districtSelect.style.display = 'block'
        if (districtInput) districtInput.style.display = 'none'

        if (masjidSelect) {
            masjidSelect.style.display = 'block'
            masjidSelect.innerHTML = '<option value="">-- منتخب کریں --</option>'
        }
        if (institutionInput) institutionInput.style.display = 'none'

        if (nameSelect) {
            nameSelect.style.display = 'block'
            nameSelect.innerHTML = '<option value="">-- پہلے مسجد منتخب کریں --</option>'
        }
        if (nameInput) nameInput.style.display = 'none'

        if (number) number.readOnly = true

        const targetData = catType === 'mutoon' ? mutoonData : sharahData
        if (districtSelect) {
            districtSelect.innerHTML = '<option value="">-- منتخب کریں --</option>'
            const rawDistricts = targetData.map(item => sanitizeDistrict(item.district)).filter(Boolean)
            const districts = [...new Set(rawDistricts)].sort()
            districts.forEach(d => {
                const opt = document.createElement('option')
                opt.value = d
                opt.textContent = d
                districtSelect.appendChild(opt)
            })
        }
    } else {
        // Talaba / Madaris Categories: Show Halqa as strict dropdown, Madarsa as strict dropdown, Student Name & Phone editable
        if (districtContainer) districtContainer.style.display = 'block'
        if (districtSelect) {
            districtSelect.style.display = 'block'
            districtSelect.innerHTML = '<option value="">-- منتخب کریں --</option>'
            const rawDistricts = institutionsData.map(item => sanitizeDistrict(item.district)).filter(Boolean)
            const districts = [...new Set(rawDistricts)].sort()
            districts.forEach(d => {
                const opt = document.createElement('option')
                opt.value = d
                opt.textContent = d
                districtSelect.appendChild(opt)
            })
        }
        if (districtInput) districtInput.style.display = 'none'

        if (masjidSelect) {
            masjidSelect.style.display = 'block'
            masjidSelect.innerHTML = '<option value="">-- منتخب کریں --</option>'
        }
        if (institutionInput) institutionInput.style.display = 'none'

        if (nameSelect) nameSelect.style.display = 'none'
        if (nameInput) {
            nameInput.style.display = 'block'
            nameInput.readOnly = false
        }

        if (number) number.readOnly = false
    }
}

if (categorySelect) {
    categorySelect.addEventListener('change', () => {
        updateCategoryFields(true)
    })
}

// 1. When District / Halqa is chosen from dropdown (Aimma & Madaris)
if (districtSelect) {
    districtSelect.addEventListener('change', () => {
        const selectedCategory = categorySelect ? categorySelect.value : ''
        const catType = getCategoryType(selectedCategory)
        const selDistrict = districtSelect.value.trim()

        if (districtInput) districtInput.value = selDistrict
        if (institutionInput) institutionInput.value = ''
        if (nameInput) nameInput.value = ''
        if (number) number.value = ''

        if (catType === 'madaris') {
            if (masjidSelect) {
                if (!selDistrict) {
                    masjidSelect.innerHTML = '<option value="">-- منتخب کریں --</option>'
                } else {
                    masjidSelect.innerHTML = '<option value="">-- مدرسہ / جامعہ منتخب کریں --</option>'
                    const filtered = institutionsData.filter(item => sanitizeDistrict(item.district).toLowerCase() === selDistrict.toLowerCase())
                    const listToUse = filtered.length > 0 ? filtered : institutionsData
                    const madarisMap = new Map()
                    listToUse.forEach(item => {
                        if (!item.name) return
                        const key = normalizeMasjid(item.name).toLowerCase()
                        if (!key) return
                        if (!madarisMap.has(key)) {
                            madarisMap.set(key, normalizeMasjid(item.name))
                        }
                    })
                    Array.from(madarisMap.values()).sort().forEach(name => {
                        const opt = document.createElement('option')
                        opt.value = name
                        opt.textContent = name
                        masjidSelect.appendChild(opt)
                    })
                }
            }
            return
        }

        const targetData = catType === 'mutoon' ? mutoonData : sharahData

        if (masjidSelect) {
            if (!selDistrict) {
                masjidSelect.innerHTML = '<option value="">-- منتخب کریں --</option>'
            } else {
                masjidSelect.innerHTML = '<option value="">-- مسجد منتخب کریں --</option>'
                const filtered = targetData.filter(item => sanitizeDistrict(item.district).toLowerCase() === selDistrict.toLowerCase())
                const masjidMap = new Map()
                filtered.forEach(item => {
                    if (!item.masjid) return
                    const key = normalizeMasjid(item.masjid).toLowerCase()
                    if (!key) return
                    if (!masjidMap.has(key)) {
                        masjidMap.set(key, normalizeMasjid(item.masjid))
                    }
                })
                Array.from(masjidMap.values()).sort().forEach(m => {
                    const opt = document.createElement('option')
                    opt.value = m
                    opt.textContent = m
                    masjidSelect.appendChild(opt)
                })
            }
        }

        if (nameSelect) {
            nameSelect.innerHTML = '<option value="">-- پہلے مسجد منتخب کریں --</option>'
        }
    })
}

// 2. When Masjid / Madarsa is chosen from dropdown
if (masjidSelect) {
    masjidSelect.addEventListener('change', () => {
        const selectedCategory = categorySelect ? categorySelect.value : ''
        const catType = getCategoryType(selectedCategory)
        const selMasjid = masjidSelect.value.trim()

        if (institutionInput) institutionInput.value = selMasjid

        if (catType === 'madaris') {
            return
        }

        const targetData = catType === 'mutoon' ? mutoonData : sharahData
        const selDistrict = districtSelect ? districtSelect.value.trim() : ''

        if (nameInput) nameInput.value = ''
        if (number) number.value = ''

        if (nameSelect) {
            if (!selMasjid) {
                nameSelect.innerHTML = '<option value="">-- پہلے مسجد منتخب کریں --</option>'
            } else {
                nameSelect.innerHTML = '<option value="">-- نام منتخب کریں --</option>'
                const filtered = targetData.filter(item => {
                    const mMatch = item.masjid && normalizeMasjid(item.masjid).toLowerCase() === normalizeMasjid(selMasjid).toLowerCase()
                    const dMatch = !selDistrict || (item.district && sanitizeDistrict(item.district).toLowerCase() === selDistrict.toLowerCase())
                    return mMatch && dMatch
                })

                filtered.forEach(item => {
                    if (item.name) {
                        const opt = document.createElement('option')
                        opt.value = item.name
                        opt.textContent = item.name
                        nameSelect.appendChild(opt)
                    }
                })

                if (filtered.length === 1) {
                    nameSelect.value = filtered[0].name
                    if (nameInput) nameInput.value = filtered[0].name
                    if (certificateNameInput && !certificateNameInput.value) certificateNameInput.value = filtered[0].name
                    if (number) number.value = filtered[0].phone || ''
                } else {
                    nameSelect.value = ''
                    if (nameInput) nameInput.value = ''
                    if (number) number.value = ''
                }
            }
        }
    })
}

// 3. When Imam Name is chosen from dropdown
if (nameSelect) {
    nameSelect.addEventListener('change', () => {
        const selectedCategory = categorySelect ? categorySelect.value : ''
        const catType = getCategoryType(selectedCategory)
        const targetData = catType === 'mutoon' ? mutoonData : sharahData
        const selMasjid = masjidSelect ? masjidSelect.value.trim() : ''
        const selName = nameSelect.value.trim()

        if (nameInput) nameInput.value = selName
        if (certificateNameInput && !certificateNameInput.value) certificateNameInput.value = selName

        const matched = targetData.find(item => {
            const nMatch = item.name && item.name.trim().toLowerCase() === selName.toLowerCase()
            const mMatch = !selMasjid || (item.masjid && normalizeMasjid(item.masjid).toLowerCase() === normalizeMasjid(selMasjid).toLowerCase())
            return nMatch && mMatch
        })

        if (matched && number) {
            number.value = matched.phone || ''
        }
    })
}

loadData()

form.onsubmit = async (event) => {
    event.preventDefault()

    if (districtSelect && districtSelect.style.display !== 'none' && !districtSelect.value.trim()) {
        error.innerHTML = "براہ کرم پہلے ضلعی جمعیت منتخب کریں"
        error.scrollIntoView({ behavior: 'smooth', block: 'center' })
        return
    }

    if (masjidSelect && masjidSelect.style.display !== 'none' && !masjidSelect.value.trim()) {
        error.innerHTML = "براہ کرم مدرسہ / جامعہ / مسجد منتخب کریں"
        error.scrollIntoView({ behavior: 'smooth', block: 'center' })
        return
    }

    const adharRegex = /^[2-9]{1}[0-9]{11}$/;

    if (!adharRegex.test(adharNo.value)) {
        error.innerHTML = "Please enter a valid 12-digit Aadhaar number"
        return
    } else {
        error.innerHTML = "";
    }

    if (number.value.length < 10 || number.value.length > 10) {
        error.innerHTML = 'Please Enter valid phone number'
        return
    } else if (img_base64 == undefined) {
        error.innerHTML = "Please capture image"
        return
    }

    //because image is removed now getting image from webcam
    // else if ( image.files.length == 0 || image.files.length < 1 ) {
    //     error.innerHTML = 'Please Upload Image '
    //     return
    // } else if ( !( image.files[ 0 ].type == 'image/jpeg' || image.files[ 0 ].type == 'image/jpg' || image.files[ 0 ].type == 'image/png' ) ) {
    //     error.innerHTML = 'Please Upload jpeg or jpg or png image'
    //     return
    // } else if ( image.files[ 0 ].type == 'image/jpeg' || image.files[ 0 ].type == 'image/jpg' || image.files[ 0 ].type == 'image/png' ) {
    //     let imageSizeInKb = Math.floor( image.files[ 0 ].size / 1024 )
    //     if ( imageSizeInKb > 300 ) {
    //         error.innerHTML = 'Image size will be less than 300kb'
    //         return
    //     }
    // }

    if (file.files.length == 0 || file.files.length < 1) {
        error.innerHTML = 'Please Upload Your  Document'
        return
    } else if (file.files[0].type != 'application/pdf') {
        error.innerHTML = 'Please upload pdf document'
        return
    } else if (file.files[0].type == 'application/pdf') {
        let fileSizeInKb = Math.floor(file.files[0].size / 1024)
        if (fileSizeInKb > 1024) {
            error.innerHTML = 'Pdf size will be less than 1MB'
            return
        } else {
            error.innerHTML = ''
            submit.style.display = 'none'
            loading.style.display = 'block'
        }
    }

    let formData = new FormData(form)
    //img_base64, dataURLtoBlob is defined in the webcam.js
    let blob = dataURLtoBlob(img_base64);
    formData.append("image", blob, "photo.png")

    let response = await fetch('/musabqa-registeration', {
        method: 'post',
        body: formData
    })

    let result = await response.json()

    loading.style.display = 'none'

    if (result.status == 'error') {
        error.innerHTML = result.message
        submit.style.display = 'block'
        error.scrollIntoView({ behavior: 'smooth', block: 'center' })
    } else if (result.status == 'success') {
        const category = document.querySelector("select[name=category]");
        const downloadBook = document.querySelector(".download-book");
        const bookHadith = document.querySelector(".book-hadith");
        const bookMutoon = document.querySelector(".book-mutoon");
        const bookSharah = document.querySelector(".book-sharah");

        if (downloadBook && category) {
            const catVal = category.value || '';
            if (catVal.includes('احادیث') || catVal.includes('اللولو') || catVal.includes('اللؤلؤ')) {
                downloadBook.style.display = "block";
                if (bookHadith) bookHadith.style.display = "block";
                if (bookMutoon) bookMutoon.style.display = "none";
                if (bookSharah) bookSharah.style.display = "none";
            } else if (catVal.includes('متون') || catVal.includes('الطحاوية')) {
                downloadBook.style.display = "block";
                if (bookMutoon) bookMutoon.style.display = "block";
                if (bookHadith) bookHadith.style.display = "none";
                if (bookSharah) bookSharah.style.display = "none";
            } else if (catVal.includes('شرح') || catVal.includes('العقیدۃ')) {
                downloadBook.style.display = "block";
                if (bookSharah) bookSharah.style.display = "block";
                if (bookHadith) bookHadith.style.display = "none";
                if (bookMutoon) bookMutoon.style.display = "none";
            } else {
                downloadBook.style.display = "none";
                if (bookHadith) bookHadith.style.display = "none";
                if (bookMutoon) bookMutoon.style.display = "none";
                if (bookSharah) bookSharah.style.display = "none";
            }
        }

        error.innerHTML = ''
        form.classList.add('hidden')
        popupContainer.classList.add('active')
    }
}