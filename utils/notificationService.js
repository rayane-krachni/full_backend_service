const Notification = require('../models/notification');
const Settings = require('../models/settings');
const Charges = require('../models/charges');
const Sales = require('../models/sell');
const Objectif = require('../models/objectifs');

const createNotification = async (userId, message) => {
    const notification = new Notification({
        user: userId,
        message: message,
        isRead: false,
    });
    await notification.save();
};

const checkGeneralNotifications = async (user, data, stock, general) => {
    if (general.receiveNotifications) {
        if (general.notifyOnEachSale) {
            await createNotification(user._id, `New sale: ${data.quantity} units of ${data.product.name} sold for ${data.total} total.`);
        }
        if (stock && general.notifyOnLowStock && stock.totalVolume < general.notifyOnLowStock) {
            await createNotification(user._id, `Low stock alert: Only ${stock.totalVolume} units of ${data.product.name} left.`);
        }
    }
};

const getSalesAndChargesForPeriod = async (storeId, period) => {
    const now = new Date();
    let startOfPeriod, endOfPeriod;

    switch (period) {
        case 'daily':
            startOfPeriod = new Date(now.setHours(0, 0, 0, 0));
            endOfPeriod = new Date(now.setHours(23, 59, 59, 999));
            break;
        case 'weekly':
            startOfPeriod = new Date(now.setDate(now.getDate() - now.getDay()));
            endOfPeriod = new Date(now.setHours(23, 59, 59, 999));
            break;
        case 'monthly':
            startOfPeriod = new Date(now.getFullYear(), now.getMonth(), 1);
            endOfPeriod = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            break;
        case 'annual':
            startOfPeriod = new Date(now.getFullYear(), 0, 1);
            endOfPeriod = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
            break;
        default:
            throw new Error(`Invalid period: ${period}`);
    }

    const sales = await Sales.find({
        store: storeId,
        createdAt: { $gte: startOfPeriod, $lte: endOfPeriod },
        isDeleted: false,
    });
    const charges = await Charges.find({
        store: storeId,
        createdAt: { $gte: startOfPeriod, $lte: endOfPeriod },
        isDeleted: false,
    });

    return { sales, charges };
};

const isPeriodMatch = (period, lastNotificationDate) => {
    if (period === 'reach') {
        return true;
    }

    const now = new Date();
    const lastNotified = lastNotificationDate ? new Date(lastNotificationDate) : null;

    switch (period) {
        case 'daily':
            return !lastNotified || lastNotified.toDateString() !== now.toDateString();
        case 'weekly':
            const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
            return !lastNotified || lastNotified < startOfWeek;
        case 'monthly':
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            return !lastNotified || lastNotified < startOfMonth;
        case 'annual':
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            return !lastNotified || lastNotified < startOfYear;
        default:
            return false;
    }
};

const checkPersonalizedNotifications = async (user, data, personalized, objectif, storeId) => {
    const settings = await Settings.findOne({ user: user._id });
    if (!settings) return;

    for (const setting of personalized) {
        const { type, threshold, product, period, lastNotified, lastQte } = setting;

        if (period === 'reach') {
        
            let cumulativeValue = lastQte || 0;
            cumulativeValue += data.quantity;

            if (cumulativeValue >= threshold) {
                const timesReached = Math.floor(cumulativeValue / threshold);
                const nextNotificationValue = timesReached * threshold;

                if (cumulativeValue >= nextNotificationValue) {
                    let message = '';
                    switch (type) {
                        case 'totalSales':
                            message = `Sales threshold reached: ${nextNotificationValue} units sold.`;
                            break;
                        case 'totalCharges':
                            message = `Charge threshold reached: ${nextNotificationValue} €.`;
                            break;
                        case 'salesByProductType':
                            message = `Sales of ${data.product.name} reached: ${nextNotificationValue} units.`;
                            break;
                        case 'revenueAmount':
                            message = `Revenue threshold reached: ${nextNotificationValue} €.`;
                            break;
                        case 'profitAmount':
                            message = `Profit threshold reached: ${nextNotificationValue} €.`;
                            break;
                        case 'goalPercentage':
                            message = `Goal percentage reached: ${nextNotificationValue} %.`;
                            break;
                        case 'breakEvenLevel':
                            message = `Break-even threshold reached: ${nextNotificationValue} €.`;
                            break;
                        default:
                            console.warn(`Unknown setting type: ${type}`);
                            continue;
                    }
                    await createNotification(user._id, message);
                    setting.lastQte = nextNotificationValue;
                }
            }

            setting.lastNotified = new Date();

        
            await settings.save();
            continue;
        }

    
        if (!isPeriodMatch(period, lastNotified)) {
            continue;
        }

    
        const { sales, charges } = await getSalesAndChargesForPeriod(storeId, period);
        const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
        const totalCharges = charges.reduce((sum, charge) => sum + charge.amount, 0);
        const totalProfit = totalRevenue - totalCharges;

        let cumulativeValue = lastQte || 0;
        let currentValue = 0;

    
        switch (type) {
            case 'totalSales':
                currentValue = data.quantity;
                cumulativeValue += currentValue;
                break;

            case 'totalCharges':
                currentValue = totalCharges;
                cumulativeValue = currentValue;
                break;

            case 'salesByProductType':
                if (data.product._id.toString() === product) {
                    currentValue = data.quantity;
                    cumulativeValue += currentValue;
                }
                break;

            case 'revenueAmount':
                currentValue = totalRevenue;
                cumulativeValue = currentValue;
                break;

            case 'profitAmount':
                currentValue = totalProfit;
                cumulativeValue = currentValue;
                break;

            case 'goalPercentage':
                const goalPercentage = (totalRevenue / getPeriodGoal(objectif.salesGoals[0].totalAnnualSales, period)) * 100;
                currentValue = goalPercentage;
                cumulativeValue = currentValue;
                break;

            case 'breakEvenLevel':
                const breakEven = totalRevenue - getPeriodGoal(objectif.profitGoals[0].totalAnnualProfit, period);
                currentValue = breakEven;
                cumulativeValue = currentValue;
                break;

            default:
                console.warn(`Unknown setting type: ${type}`);
                continue;
        }

    
        if (cumulativeValue >= threshold) {
            const timesReached = Math.floor(cumulativeValue / threshold);
            const nextNotificationValue = timesReached * threshold;

            if (cumulativeValue >= nextNotificationValue) {
                let message = '';
                switch (type) {
                    case 'totalSales':
                        message = `Sales threshold reached: ${nextNotificationValue} units sold.`;
                        break;
                    case 'totalCharges':
                        message = `Charge threshold reached: ${nextNotificationValue} €.`;
                        break;
                    case 'salesByProductType':
                        message = `Sales of ${data.product.name} reached: ${nextNotificationValue} units.`;
                        break;
                    case 'revenueAmount':
                        message = `Revenue threshold reached: ${nextNotificationValue} €.`;
                        break;
                    case 'profitAmount':
                        message = `Profit threshold reached: ${nextNotificationValue} €.`;
                        break;
                    case 'goalPercentage':
                        message = `Goal percentage reached: ${nextNotificationValue} %.`;
                        break;
                    case 'breakEvenLevel':
                        message = `Break-even threshold reached: ${nextNotificationValue} €.`;
                        break;
                }
                await createNotification(user._id, message);
                setting.lastQte = nextNotificationValue;
            }
        }

        setting.lastNotified = new Date();

    
        await settings.save();
    }
};

const getPeriodGoal = (annualGoal, period) => {
    switch (period) {
        case 'daily':
            return annualGoal / 365;
        case 'weekly':
            return annualGoal / 52;
        case 'monthly':
            return annualGoal / 12;
        case 'annual':
            return annualGoal;
        default:
            throw new Error(`Invalid period: ${period}`);
    }
};

const checkAndSendNotifications = async (user, data, stock = null) => {
    try {
        const settings = await Settings.findOne({ user: user._id });
        if (!settings) return;

        const { general, personalized } = settings;

        const objectif = await Objectif.findOne({ user: user._id });
        if (!objectif) return;

        await checkGeneralNotifications(user, data, stock, general);

        await checkPersonalizedNotifications(user, data, personalized, objectif, data.store);

    } catch (error) {
        console.error('Error in checkAndSendNotifications:', error);
    }
};

module.exports = {
    createNotification,
    checkAndSendNotifications,
};