const { getCitySalonsService } = require("../../services/salon.service");

const getCityFilterUser = async(request, resposne) => {
    try{
         const { statusFilter = 'all' } = request.query;  
        const cityList = await getCitySalonsService(statusFilter);
        return resposne.status(200).json({
            status:"SUCCESS",
            message: "List fetched succesfully",
            data :cityList
        });   
    }
    catch (error){
        console.log("Error in getCities", error);

        return resposne.status(500).json({
            status:"FAILED",
            message:error.message
        });
    }
};
module.exports = {
    getCityFilterUser
}