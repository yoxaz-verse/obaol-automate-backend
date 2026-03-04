type Translations = {
    [lang: string]: {
        [key: string]: string;
    };
};

const translations: Translations = {
    en: {
        "Your OTP Code": "Your OTP Code",
        "Your verification code is: {code}": "Your verification code is: {code}",
        "This code will expire shortly.": "This code will expire shortly.",
        "Obaol Verification": "Obaol Verification",
        "ID must be provided": "ID must be provided",
        "An unexpected error occurred": "An unexpected error occurred",
        "Credentials error": "Credentials error",
        "Login successful": "Login successful",
        "OTP sent successfully": "OTP sent successfully",
    },
    hi: {
        "Your OTP Code": "आपका ओटीपी कोड",
        "Your verification code is: {code}": "आपका सत्यापन कोड है: {code}",
        "This code will expire shortly.": "यह कोड जल्द ही समाप्त हो जाएगा।",
        "Obaol Verification": "ओबोल सत्यापन",
        "ID must be provided": "आईडी प्रदान की जानी चाहिए",
        "An unexpected error occurred": "एक अप्रत्याशित त्रुटि हुई",
        "Credentials error": "क्रेडेंशियल त्रुटि",
        "Login successful": "लॉगिन सफल",
        "OTP sent successfully": "ओटीपी सफलतापूर्वक भेजा गया",
    },
    ar: {
        "Your OTP Code": "رمز OTP الخاص بك",
        "Your verification code is: {code}": "رمز التحقق الخاص بك هو: {code}",
        "This code will expire shortly.": "ستنتهي صلاحية هذا الرمز قريبًا.",
        "Obaol Verification": "تحقق أوباول",
        "ID must be provided": "يجب تقديم المعرف",
        "An unexpected error occurred": "حدث خطأ غير متوقع",
        "Credentials error": "خطأ في بيانات الاعتماد",
        "Login successful": "تم تسجيل الدخول بنجاح",
        "OTP sent successfully": "تم إرسال رمز OTP بنجاح",
    },
    bn: {
        "Your OTP Code": "আপনার ওটিপি কোড",
        "Your verification code is: {code}": "আপনার ভেরিফিকেশন কোড হল: {code}",
        "This code will expire shortly.": "এই কোডের মেয়াদ শীঘ্রই শেষ হয়ে যাবে।",
        "Obaol Verification": "ওবাওল যাচাইকরণ",
        "ID must be provided": "আইডি প্রদান করতে হবে",
        "An unexpected error occurred": "একটি অপ্রত্যাশিত ত্রুটি ঘটেছে",
        "Login successful": "লগইন সফল হয়েছে",
    },
};

export const t = (key: string, lang: string = "en", params: Record<string, string> = {}): string => {
    const normalizedLang = lang.toLowerCase();
    const langTranslations = translations[normalizedLang] || translations["en"];
    let message = langTranslations[key] || translations["en"][key] || key;

    // Replace params
    Object.keys(params).forEach((param) => {
        message = message.replace(`{${param}}`, params[param]);
    });

    return message;
};
