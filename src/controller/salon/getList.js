const { getCitiesService } = require("../../services/salon.service");

const getListFilter = async(request, resposne) => {
    try{
         const { statusFilter = 'all' } = request.query;  
        const cityList = await getCitiesService(statusFilter.toLowerCase());

           const isEmpty = cityList.length === 0;

        return resposne.status(200).json({
            status:"SUCCESS",
             message: isEmpty 
              ? `No cities found for ${statusFilter || 'all'} status`
              : "List fetched successfully",
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
    getListFilter
}