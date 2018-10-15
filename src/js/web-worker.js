//listen for messages
self.onmessage = (e)=>{
    switch(e.data){
        case 'check-for-backup':
            syncDatabase('fetchAll')
            .then(obj=>{
                if(obj.data.orders.length == 0 
                 && obj.data.categories.length == 0 
                 && obj.data.items.length == 0 
                 && obj.data.users.length == 0)
                 {
                     postMessage('no-data');
                 }else{
                    implementUpdates(obj)
                    .then(data=>{
                        postMessage(data);
                    })  
                 }
            })
            .catch(err=>{
                postMessage('err-connect');
            })
        break;
    }
}
var Dexie = require('dexie'),
    db,
    orders = [],
    users = [],
    products = {
        categories: [],
        items: []
    },
    settings = [],
    withdrawals =  [];
    settings = {};
//run in catch should in case databse dose not exits
try {
    db = new Dexie("snapBurgerDb");
    db.version(1).stores({
        users: "++id,&name,password,position,startDate,salary,status,is_mgr,img_url",
        categories: "++id,&name,status,action",
        items: "++id,&name,rate,category,status,action",
        orders: "++id,inv,date,*items,totalPrice,tableNum,totalQuantity,staff",
        settings: "&id,tableNumber,time_range,auto_update,back_up,performance_report,os_name",
        withdrawals:"++id,inv,reason,amount,date",
        tracker:"++id,type,tableName,data,date,status"
    })
} catch (e) {
    //
}

//fetching database
function fetchDatabase() {
    return new Promise((resolve,reject)=>{
        db.transaction('r', db.users, db.orders, db.categories, db.items, db.settings,db.withdrawals,db.settings, () => {
            db.settings.get(1)
                .then((res) => {
                    settings = res;
                })
            db.users.toArray()
                .then((data) => {
                    users = data;
                });
            //fetched users and now fetching categories
            db.categories.toArray()
                .then((data) => {
                    products.categories = data;
                })
            //fetcing items
            db.items.toArray()
                .then((data) => {
                    products.items = data;
                })
            //fetching orders
            db.orders.toArray()
                .then((data) => {
                    orders = data;
                })
            db.withdrawals.toArray()
                .then((data)=>{
                    withdrawals = data;
                })
            db.settings.get(1)
            .then(data=>{
                settings = data;
            })
        })
        .then((data) => {
            //code to write when fetching of database succedeed!
            resolve();
        })
        .catch(err => {
            reject(err);
        })
    })
}

function checkTimeRange() {
    try {
        db.settings.get(1)
            .then((data) => {
                try {
                    from_time = data.time_range.from.split(":"),
                        to_time = data.time_range.to.split(":"),
                        d = new Date();
                    //send notifications in intervals of 5,10,15 mins
                    //var to_mins = new Date(`jQuery{d.toDateString()} jQuery{data.time_range.to}`);
                    //disable orders if time is less than time_range from time
                    if (d.getHours() > Number(to_time[0]) || d.getHours() == Number(to_time[0]) && d.getMinutes() >= Number(to_time[1])) {
                        postMessage("end-orders");
                    } else if (d.getHours() < Number(from_time[0]) || d.getHours() == Number(from_time[0]) && d.getMinutes() <= Number(from_time[1])) {
                        postMessage("end-orders");
                    } else {
                        postMessage("resume-orders");
                    }
                } catch (e) {
                    //console.log("empty!");
                }
            })
            .catch(e => {
                //
            })
    } catch (err) {
        console.log("Failed:" + err)
    } finally {
        return false;
    }
}
var checkTime = setInterval(checkTimeRange, 2500);
//creating ajax functions,data must be an array
var ajax = ({url,data,dataType,type})=>{
    return new Promise((resolve,reject)=>{
        var status = false,data_array = [],data_string = "",req;
        if(type == null){
            type = 'GET';
        }
        if(dataType == null){
            dataType = 'text';
        }
        //data must be array, my method to serialize data
        for(x in data){
            for(i in Object.keys(data[x])){
                data_array.push(`${Object.keys(data[x])[i]}=${Object.values(data[x])[i]}`);
            }
            
        }
        data_string = data_array.join("&");
        //now rqueating
        req = new XMLHttpRequest();
        req.open(type,url,false);
        req.timeout = 60000;
        req.responseType = dataType;
        req.setRequestHeader("Content-type","application/x-www-form-urlencoded");
        req.onreadystatechange = ()=>{
            if(req.readyState === 4 && req.status === 200){
                resolve(req.response)
            }else{
                reject("Connection to server failed!");
            }
        }
        req.onerror = (err)=>{
            reject(err);
        }
        req.send(data_string);
        
        

    })

}
function syncDatabase(type = null) {
    return new Promise((resolve,reject)=>{
        fetchDatabase()
        .then(()=>{
            var url = 'http://localhost/snapburger_sync.php';
            var dbSend = [
                {table: "users",data: users},
                {table: "categories",data: products.categories},
                {table: "items",data: products.items},
                {table: "orders",data: orders},
                {table: "settings",data: settings},
                {table: "withdrawals",data: withdrawals}
            ]
            if(type== 'fetchAll'){
                dbSend = [{type:"fetchAll",db:""}]
            }else{
                dbSend = [{type:"push",db:JSON.stringify(dbSend)}];
            }
            //ajax
            ajax({url:url,dataType:'json',data:dbSend,type:"POST"})
            .then(data=>{
                resolve(data);
            })
            .catch(err=>{
                reject(err);
            })
        })
    })
}
//call sync fucntion


function implementUpdates({method,data}){
    return new Promise((resolve,reject)=>{
        switch(method){
            case 'addAll':
            db.transaction('rw',db.orders,db.categories,db.items,db.users,db.withdrawals,()=>{
                //adding orders if length is greater than 0 ,and doing the same for the rest
                if(data.orders.length > 0){
                    data.orders.forEach(el=>{
                        el.totalQuantity = Number(el.totalQuantity);
                        el.totalPrice = Number(el.totalPrice);
                        el.date = new Date(el.date);
                        el.items.forEach(it=>{
                            delete it.$$hashKey;
                            it.quantity = Number(it.quantity);
                        })
                    })
                    db.orders.bulkAdd(data.orders);
                }
                if(data.categories.length>0){
                    db.categories.bulkAdd(data.categories);
                }
                if(data.items.length>0){
                    data.items.forEach(el=>{
                        el.rate = Number(el.rate);
                    })
                    db.items.bulkAdd(data.items);
                }
                if(data.users.length>0){
                    data.users.forEach(el=>{
                        el.is_mgr = (Number(el.is_mgr) == 1)?true:false;
                        el.salary = Number(el.salary);
                    })
                    db.users.bulkAdd(data.users);
                }
                if(data.withdrawals.length>0){
                    data.withdrawals.forEach(el=>{
                        el.date = new Date(el.date);
                        el.amount = Number(el.amount);
                    })
                    db.withdrawals.bulkAdd(data.withdrawals);
                }
            })
            .then(()=>{
                resolve('data-restored');
            })
            .catch(err=>{
                reject(err);
            })
            
            break;
        }
    })
}