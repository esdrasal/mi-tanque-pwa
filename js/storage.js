const SK = 'mi_tanque_v3';
let state = { entries:[], setup:null };
try { const s=localStorage.getItem(SK); if(s) state=JSON.parse(s); } catch(e){}
function persist(){ try{ localStorage.setItem(SK,JSON.stringify(state)); }catch(e){} }
