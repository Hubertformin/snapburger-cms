app.controller('settingsCtr',($scope)=>{
//the time picker ..
    var elems = document.querySelectorAll('.timepicker');
    var instances = M.Timepicker.init(elems,{
        twelveHour:false
    });
    //
    jQuery('#orders_from').val($scope.settings.time_range.from);
    jQuery('#orders_to').val($scope.settings.time_range.to);
    //function to update settings
    $scope.updateSettings = (con)=>{
        if(typeof jQuery('#orders_from').val() !== 'string' || typeof jQuery('#orders_to').val() !== 'string'){
            notifications.notify({type:"error",msg:"Please select time properly!"})
            return false;
        }
        if(con == 'reset-default'){
            $scope.settings.time_range.from = "8:00";
            $scope.settings.time_range.to = "21:30";
            jQuery('#orders_from').val("8:00");
            jQuery('#orders_to').val("21:30");
        }else{
            $scope.settings.time_range.from = jQuery('#orders_from').val();
            $scope.settings.time_range.to = jQuery('#orders_to').val();
        }

        $scope.db.settings.put($scope.settings)
        .then(()=>{
            $scope.db.settings.get(1)
            .then(res=>{
                $scope.settings = res;
                console.log(res)
                $scope.$apply();
            })
        })
    }
    //on change of to and from inputs
    jQuery('#orders_from').change(()=>{
        $scope.settings.time_range.from = jQuery('#orders_from').val();
        $scope.updateSettings();
    })
    jQuery('#orders_to').change(()=>{
        $scope.settings.time_range.to = jQuery('#orders_to').val();
        $scope.updateSettings();
    })

});