let cron = require('node-cron');
const httpStatus = require('http-status');
const { User } = require('../models');


const resetCounterForAllUsers = async () => {
    cron.schedule('0 0 1 * *', async () => {
        console.log('Reseting Counter For all Users');
        const resetCreditsResult = await User.updateMany(
            { },
            [
               { $set: { counter: 0 } },
            ]
        );
        if (!resetCreditsResult) {
            throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'Credits resetting failed');
        }
        console.log(resetCreditsResult);
    });
};


const resetCounterForUser = async (userId) => {
    cron.schedule('* * * * *', () => {
        console.log('running a task every minute');
      });
};


module.exports = {
    resetCounterForAllUsers,
    resetCounterForUser,
  };
  
