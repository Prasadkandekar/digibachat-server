const OTP = require('../modals/OTP');

const generateOTP = () => {
    return Math.floor(100000 + Math.random()*900000).toString();
};

//Create and save OTP
const createOTP = async (userId)=>{
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() +process.env.OTP_EXPIRY_MINUTES*60*1000);

    await OTP.create(userId,otp,expiresAt);
    return otp;
}

//Veryfy OTP

const verifyOTP = async (userId,otp)=>{
    const validOTP = await OTP.findValidOTP(userId,otp);

    if(!validOTP){
        return false;
    }

    await OTP.markAsUsed(validOTP.id);
    return true;
};

module.exports = { generateOTP, createOTP, verifyOTP };
