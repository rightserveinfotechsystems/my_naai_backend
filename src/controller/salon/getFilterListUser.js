const { getCitySalonsService } = require("../../services/salon.service");

const getCityFilterUser = async(request, response) => { 
    try{
        const cityList = await getCitySalonsService(); 
        
        return response.status(200).json({
            status: "SUCCESS",
            message: cityList.length ? "List fetched successfully" : "No cities available",
            data: cityList
        });   
    } catch (error){
        console.log("Error in getCityFilterUser", error);
        return response.status(500).json({
            status: "FAILED",
            message: error.message
        });
    }
};

module.exports = {
    getCityFilterUser
}