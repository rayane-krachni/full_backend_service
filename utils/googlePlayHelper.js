const path = require('path');
const { google } = require('googleapis');
const axios = require('axios');
const keyFilePath = path.join(process.cwd(), 'data', 'static', 'private');

const auth = new google.auth.GoogleAuth({
    keyFile: keyFilePath + '/spiritualcandle.json',
    scopes: ['https://www.googleapis.com/auth/androidpublisher']
});
const countryCurrencyMap = {
    "AF": "AFN", // Afghanistan Afghani
    "AL": "ALL", // Albania Lek
    "DZ": "DZD", // Algeria Dinar
    "AS": "USD", // American Samoa Dollar
    "AD": "EUR", // Andorra Euro
    "AO": "AOA", // Angola Kwanza
    "AI": "XCD", // Anguilla East Caribbean Dollar
    "AQ": "AUD", // Antarctica Australian Dollar
    "AG": "XCD", // Antigua and Barbuda East Caribbean Dollar
    "AR": "ARS", // Argentina Peso
    "AM": "AMD", // Armenia Dram
    "AW": "AWG", // Aruba Florin
    "AU": "AUD", // Australia Dollar
    "AT": "EUR", // Austria Euro
    "AZ": "AZN", // Azerbaijan Manat
    "BS": "BSD", // Bahamas Dollar
    "BH": "BHD", // Bahrain Dinar
    "BD": "BDT", // Bangladesh Taka
    "BB": "BBD", // Barbados Dollar
    "BY": "BYN", // Belarus Ruble
    "BE": "EUR", // Belgium Euro
    "BZ": "BZD", // Belize Dollar
    "BJ": "XOF", // Benin CFA Franc
    "BM": "BMD", // Bermuda Dollar
    "BT": "INR", // Bhutan Ngultrum
    "BO": "BOB", // Bolivia Boliviano
    "BA": "BAM", // Bosnia and Herzegovina Mark
    "BW": "BWP", // Botswana Pula
    "BR": "BRL", // Brazil Real
    "IO": "USD", // British Indian Ocean Territory Dollar
    "BN": "BND", // Brunei Dollar
    "BG": "BGN", // Bulgaria Lev
    "BF": "XOF", // Burkina Faso CFA Franc
    "BI": "BIF", // Burundi Franc
    "CV": "CVE", // Cape Verde Escudo
    "KH": "KHR", // Cambodia Riel
    "CM": "XAF", // Cameroon CFA Franc
    "CA": "CAD", // Canada Dollar
    "KY": "KYD", // Cayman Islands Dollar
    "CF": "XAF", // Central African Republic CFA Franc
    "TD": "XAF", // Chad CFA Franc
    "CL": "CLP", // Chile Peso
    "CN": "CNY", // China Yuan
    "CX": "AUD", // Christmas Island Dollar
    "CC": "AUD", // Cocos (Keeling) Islands Dollar
    "CO": "COP", // Colombia Peso
    "KM": "KMF", // Comoros Franc
    "CD": "CDF", // Democratic Republic of the Congo Franc
    "CG": "XAF", // Republic of the Congo CFA Franc
    "CK": "NZD", // Cook Islands Dollar
    "CR": "CRC", // Costa Rica Colón
    "HR": "HRK", // Croatia Kuna
    "CU": "CUP", // Cuba Peso
    "CW": "ANG", // Curacao Guilder
    "CY": "EUR", // Cyprus Euro
    "CZ": "CZK", // Czech Republic Koruna
    "DK": "DKK", // Denmark Krone
    "DJ": "DJF", // Djibouti Franc
    "DM": "XCD", // Dominica East Caribbean Dollar
    "DO": "DOP", // Dominican Republic Peso
    "EC": "USD", // Ecuador Dollar
    "EG": "EGP", // Egypt Pound
    "SV": "USD", // El Salvador Dollar
    "GQ": "XAF", // Equatorial Guinea CFA Franc
    "ER": "ERN", // Eritrea Nakfa
    "EE": "EUR", // Estonia Euro
    "SZ": "SZL", // Eswatini Lilangeni
    "ET": "ETB", // Ethiopia Birr
    "FK": "FKP", // Falkland Islands Pound
    "FO": "DKK", // Faroe Islands Krone
    "FJ": "FJD", // Fiji Dollar
    "FI": "EUR", // Finland Euro
    "FR": "EUR", // France Euro
    "GA": "XAF", // Gabon CFA Franc
    "GM": "GMD", // Gambia Dalasi
    "GE": "GEL", // Georgia Lari
    "DE": "EUR", // Germany Euro
    "GH": "GHS", // Ghana Cedi
    "GI": "GIP", // Gibraltar Pound
    "GR": "EUR", // Greece Euro
    "GL": "DKK", // Greenland Krone
    "GD": "XCD", // Grenada East Caribbean Dollar
    "GP": "EUR", // Guadeloupe Euro
    "GU": "USD", // Guam Dollar
    "GT": "GTQ", // Guatemala Quetzal
    "GG": "GBP", // Guernsey Pound
    "GN": "GNF", // Guinea Franc
    "GW": "XOF", // Guinea-Bissau CFA Franc
    "GY": "GYD", // Guyana Dollar
    "HT": "HTG", // Haiti Gourde
    "HM": "AUD", // Heard Island and McDonald Islands Dollar
    "VA": "EUR", // Vatican City Euro
    "HN": "HNL", // Honduras Lempira
    "HK": "HKD", // Hong Kong Dollar
    "HU": "HUF", // Hungary Forint
    "IS": "ISK", // Iceland Króna
    "IN": "INR", // India Rupee
    "ID": "IDR", // Indonesia Rupiah
    "IR": "IRR", // Iran Rial
    "IQ": "IQD", // Iraq Dinar
    "IE": "EUR", // Ireland Euro
    "IM": "GBP", // Isle of Man Pound
    "IL": "ILS", // Israel New Shekel
    "IT": "EUR", // Italy Euro
    "JM": "JMD", // Jamaica Dollar
    "JP": "JPY", // Japan Yen
    "JE": "GBP", // Jersey Pound
    "JO": "JOD", // Jordan Dinar
    "KZ": "KZT", // Kazakhstan Tenge
    "KE": "KES", // Kenya Shilling
    "KI": "AUD", // Kiribati Dollar
    "KP": "KPW", // North Korea Won
    "KR": "KRW", // South Korea Won
    "KW": "KWD", // Kuwait Dinar
    "KG": "KGS", // Kyrgyzstan Som
    "LA": "LAK", // Laos Kip
    "LV": "EUR", // Latvia Euro
    "LB": "LBP", // Lebanon Pound
    "LS": "LSL", // Lesotho Loti
    "LR": "LRD", // Liberia Dollar
    "LY": "LYD", // Libya Dinar
    "LI": "CHF", // Liechtenstein Franc
    "LT": "EUR", // Lithuania Euro
    "LU": "EUR", // Luxembourg Euro
    "MO": "MOP", // Macau Pataca
    "MG": "MGA", // Madagascar Ariary
    "MW": "MWK", // Malawi Kwacha
    "MY": "MYR", // Malaysia Ringgit
    "MV": "MVR", // Maldives Rufiyaa
    "ML": "XOF", // Mali CFA Franc
    "MT": "EUR", // Malta Euro
    "MH": "USD", // Marshall Islands Dollar
    "MQ": "EUR", // Martinique Euro
    "MR": "MRU", // Mauritania Ouguiya
    "MU": "MUR", // Mauritius Rupee
    "YT": "EUR", // Mayotte Euro
    "MX": "MXN", // Mexico Peso
    "FM": "USD", // Micronesia Dollar
    "MD": "MDL", // Moldova Leu
    "MC": "EUR", // Monaco Euro
    "MN": "MNT", // Mongolia Tugrik
    "ME": "EUR", // Montenegro Euro
    "MS": "XCD", // Montserrat East Caribbean Dollar
    "MA": "MAD", // Morocco Dirham
    "MZ": "MZN", // Mozambique Metical
    "MM": "MMK", // Myanmar Kyat
    "NA": "NAD", // Namibia Dollar
    "NR": "AUD", // Nauru Dollar
    "NP": "NPR", // Nepal Rupee
    "NL": "EUR", // Netherlands Euro
    "NZ": "NZD", // New Zealand Dollar
    "NI": "NIO", // Nicaragua Córdoba
    "NE": "XOF", // Niger CFA Franc
    "NG": "NGN", // Nigeria Naira
    "NU": "NZD", // Niue Dollar
    "NF": "AUD", // Norfolk Island Dollar
    "KP": "KPW", // North Korea Won
    "MK": "MKD", // North Macedonia Denar
    "NO": "NOK", // Norway Krone
    "OM": "OMR", // Oman Rial
    "PK": "PKR", // Pakistan Rupee
    "PW": "USD", // Palau Dollar
    "PS": "ILS", // Palestinian Territories Shekel
    "PA": "PAB", // Panama Balboa
    "PG": "PGK", // Papua New Guinea Kina
    "PY": "PYG", // Paraguay Guaraní
    "PE": "PEN", // Peru Sol
    "PH": "PHP", // Philippines Peso
    "PN": "NZD", // Pitcairn Islands Dollar
    "PR": "USD", // Puerto Rico Dollar
    "QA": "QAR", // Qatar Rial
    "RE": "EUR", // Réunion Euro
    "RO": "RON", // Romania Leu
    "RU": "RUB", // Russia Ruble
    "RW": "RWF", // Rwanda Franc
    "BL": "EUR", // Saint Barthélemy Euro
    "KN": "XCD", // Saint Kitts and Nevis East Caribbean Dollar
    "LC": "XCD", // Saint Lucia East Caribbean Dollar
    "MF": "EUR", // Saint Martin Euro
    "SX": "ANG", // Sint Maarten Guilder
    "SM": "EUR", // San Marino Euro
    "ST": "STN", // São Tomé and Príncipe Dobra
    "SA": "SAR", // Saudi Arabia Riyal
    "SN": "XOF", // Senegal CFA Franc
    "RS": "RSD", // Serbia Dinar
    "SC": "SCR", // Seychelles Rupee
    "SL": "SLL", // Sierra Leone Leone
    "SG": "SGD", // Singapore Dollar
    "SX": "ANG", // Sint Maarten Guilder
    "SK": "EUR", // Slovakia Euro
    "SI": "EUR", // Slovenia Euro
    "SB": "AUD", // Solomon Islands Dollar
    "SO": "SOS", // Somalia Shilling
    "ZA": "ZAR", // South Africa Rand
    "GS": "GBP", // South Georgia and the South Sandwich Islands Pound
    "SS": "SSP", // South Sudan Pound
    "ES": "EUR", // Spain Euro
    "LK": "LKR", // Sri Lanka Rupee
    "SD": "SDG", // Sudan Pound
    "SR": "SRD", // Suriname Dollar
    "SJ": "NOK", // Svalbard and Jan Mayen Krone
    "SZ": "SZL", // Eswatini Lilangeni
    "SE": "SEK", // Sweden Krona
    "CH": "CHF", // Switzerland Franc
    "SY": "SYP", // Syria Pound
    "TW": "TWD", // Taiwan Dollar
    "TJ": "TJS", // Tajikistan Somoni
    "TZ": "TZS", // Tanzania Shilling
    "TH": "THB", // Thailand Baht
    "TL": "USD", // Timor-Leste Dollar
    "TG": "XOF", // Togo CFA Franc
    "TK": "NZD", // Tokelau Dollar
    "TO": "AUD", // Tonga Paʻanga
    "TT": "TTD", // Trinidad and Tobago Dollar
    "TN": "TND", // Tunisia Dinar
    "TR": "TRY", // Turkey Lira
    "TM": "TMT", // Turkmenistan Manat
    "TC": "USD", // Turks and Caicos Islands Dollar
    "TV": "AUD", // Tuvalu Dollar
    "UG": "UGX", // Uganda Shilling
    "UA": "UAH", // Ukraine Hryvnia
    "AE": "AED", // United Arab Emirates Dirham
    "GB": "GBP", // United Kingdom Pound
    "US": "USD", // United States Dollar
    "UY": "UYU", // Uruguay Peso
    "UZ": "UZS", // Uzbekistan Som
    "VU": "VUV", // Vanuatu Vatu
    "VE": "VES", // Venezuela Bolívar Soberano
    "VN": "VND", // Vietnam Dong
    "WF": "XPF", // Wallis and Futuna Franc
    "EH": "MAD", // Western Sahara Dirham
    "YE": "YER", // Yemen Rial
    "ZM": "ZMW", // Zambia Kwacha
    "ZW": "ZWL"  // Zimbabwe Dollar
};
const billableCountries = [
    "US", "FR", "DE", "GB", "JP", "IN", "AU", "CA", "KR", "BR",
    "MX", "ES", "IT", "NL", "CH", "SG", "AE", "SA", "ZA", "TR",
    "TH", "ID", "PH", "VN", "MY", "PL", "RU", "UA", "BE", "SE",
    "NO", "FI", "DK", "IE", "NZ", "CL", "CO", "PE", "EG",
    "IL", "JO", "KW", "QA", "OM", "LB", "CY", "GR", "PT",
    "HU", "CZ", "EE", "LV", "LT", "SK", "RO", "BG", "RS", "HR",
    "SI", "AT", "UZ", "KZ", "KG", "TJ", "TM", "GE",
    "MD", "ME", "MK", "MT", "IS", "LU", "LI",
    "MC", "SM", "VA"
    // , "BH"
];

// async function generateRegionalPrices(basePrice, baseCurrency) { const rates = await fetchConversionRates(baseCurrency); const prices = {}; for (const [currency, rate] of Object.entries(rates)) { prices[currency] = { priceMicros: Math.round(basePrice * rate * 1e6).toString(), currency: currency }; } return prices; }
async function generateRegionalPrices(basePrice, baseCurrency) {
    const rates = await fetchConversionRates(baseCurrency);
    const prices = {};

    for (const [country, currency] of Object.entries(countryCurrencyMap)) {
        if (rates[currency] && billableCountries.includes(country)) {
            prices[country] = {
                priceMicros: Math.round(basePrice * rates[currency] * 1e6).toString(),
                currency: currency
            };
        }
    }
    for (const country in prices) {
        if (parseInt(prices[country].priceMicros) < 1000000) {
            prices[country].priceMicros = "1000000";
        }
    }

    return prices;
}
async function fetchConversionRates(baseCurrency) {
    const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${baseCurrency}`);
    return response.data.rates;
}

const androidpublisher = google.androidpublisher({ version: 'v3', auth });
let newProduct = {
    "packageName": "com.spiritual.candle",
    "sku": "new_product_2",
    "status": "active",
    "purchaseType": "managedUser",
    "defaultPrice": {
        "priceMicros": "2000000",
        "currency": "EUR"
    },
    // "prices": {
    // },
    "listings": {
        "fr-FR": {
            "title": "new Product",
            "description": "new product"
        }
    },
    "defaultLanguage": "fr-FR",
    "managedProductTaxesAndComplianceSettings": {
        "eeaWithdrawalRightType": "WITHDRAWAL_RIGHT_DIGITAL_CONTENT"
    }
};
const convertToMicros = (price) => {
    return price * 1000000;
};
function convertToMicrosWithNanos(units, nanos) {
    units = units ? parseInt(units) : 0; nanos = nanos ? parseInt(nanos) : 0;
    return ((units * 1e6) + (nanos / 1e3)).toString();
};
function convertToCurrencyFormat(amount) {
    const currencyCode = "EUR";
    const wholeUnits = Math.floor(amount);
    const fractionalPart = amount - wholeUnits;
    const nanos = Math.round(fractionalPart * 1e9);
    if (amount < 0 && wholeUnits === 0) {
        return {
            currencyCode: currencyCode,
            units: "0",
            nanos: nanos
        };
    }

    return {
        currencyCode: currencyCode,
        units: String(wholeUnits),
        nanos: nanos
    };
}

let region = ["AG"];
const addProduct = async (product) => {
    try {
        if (product.price <= 0)
            return;
        newProduct.sku = product._id.toString()
        newProduct.defaultPrice.priceMicros = convertToMicros(product.price)
        newProduct.prices = {
            "US": { "priceMicros": newProduct.defaultPrice.priceMicros, "currency": "USD" },
            "FR": { "priceMicros": newProduct.defaultPrice.priceMicros, "currency": "EUR" },
        }
        newProduct.listings = {
            "en-US": {
                "title": product.name,
                "description": product.name
            }, "fr-FR": {
                "title": product.name,
                "description": product.name
            }
        }
        // const formatted = convertToCurrencyFormat(product.price)
        // const convertResponse = await androidpublisher.monetization.convertRegionPrices({
        //     packageName: newProduct.packageName, resource: {
        //         price: formatted
        //     }
        // });
        // newProduct.prices = Object.entries(convertResponse.data.convertedRegionPrices).reduce((acc, [region, data]) => {
        //     if (!region.includes(region))
        //         acc[region] = {
        //             priceMicros: convertToMicrosWithNanos(data.price.units, data.price.nanos),
        //             currency: data.price.currencyCode
        //         };
        //     return acc;
        // }, {});
        const response = await androidpublisher.inappproducts.insert({
            packageName: newProduct.packageName,
            resource: newProduct
        }, { params: { autoConvertMissingPrices: true } });
        return response;
    } catch (error) {
        console.error('Failed to add product:', error.response ? error.response.data : error.message);
        throw new Error(`Failed to add product: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
    }
};
const editProduct = async (product) => {
    try {
        if (product.price <= 0)
            return;
        newProduct.sku = product._id.toString()
        newProduct.defaultPrice.priceMicros = convertToMicros(product.price)
        newProduct.prices = {
            "US": { "priceMicros": newProduct.defaultPrice.priceMicros, "currency": "USD" },
            "FR": { "priceMicros": newProduct.defaultPrice.priceMicros, "currency": "EUR" }
        }
        newProduct.listings = {
            "en-US": {
                "title": product.name,
                "description": product.name
            }, "fr-FR": {
                "title": product.name,
                "description": product.name
            }
        }
        // console.log(newProduct)
        const response = await androidpublisher.inappproducts.patch({
            packageName: newProduct.packageName,
            sku: newProduct.sku,
            resource: newProduct
        }, { params: { autoConvertMissingPrices: true } });
        return response;
    } catch (error) {
        throw new Error(`Failed to update product: ${error.response}`);
    }
};

const deleteProduct = async (sku) => {
    try {
        if (product.price <= 0)
            return;
        const packageName = newProduct.packageName
        await androidpublisher.inappproducts.delete({ packageName, sku });
        return { message: 'Product deleted successfully' };
    } catch (error) {
        throw new Error(`Failed to delete product: ${error.response}`);
    }
};

const allProducts = async (sku) => {
    try {
        const response = await androidpublisher.inappproducts.list({
            packageName: newProduct.packageName
        });
        return response;
    } catch (error) {
        throw new Error(`Failed to delete product: ${error.response}`);
    }
};

module.exports = { addProduct, editProduct, deleteProduct, allProducts };
