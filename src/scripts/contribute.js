const SUPABASE_URL = "https://mvsfcsodvtojqrmvsjbi.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_dnRHPIzJ2rVP8sgygNBkHg_dmr0OxBh";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const scopeSelect = document.getElementById("scope");
const countrySelect = document.getElementById("country");
const systemSelect = document.getElementById("system");
const lineSelect = document.getElementById("line");
const stationSelect = document.getElementById("station");
const soundSelect = document.getElementById("sound");

const lineGroup = document.getElementById("line-group");
const stationGroup = document.getElementById("station-group");


/* ---------------- COUNTRY ---------------- */

async function loadCountries(){

  const {data} = await supabaseClient
    .from("countries")
    .select("id,name")
    .order("name");

  countrySelect.innerHTML="";

  data.forEach(c=>{
    const o=document.createElement("option");
    o.value=c.id;
    o.textContent=c.name;
    countrySelect.append(o);
  });

}


/* ---------------- SYSTEMS ---------------- */

async function loadSystems(countryId){

  const {data} = await supabaseClient
    .from("systems")
    .select("id,name")
    .eq("country_id",countryId)
    .order("name");

  systemSelect.innerHTML="";

  data.forEach(s=>{
    const o=document.createElement("option");
    o.value=s.id;
    o.textContent=s.name;
    systemSelect.append(o);
  });

}


/* ---------------- STATIONS ---------------- */

async function loadStations(systemId){

  const {data} = await supabaseClient
    .from("stations")
    .select("id,name")
    .eq("system_id",systemId)
    .order("name");

  stationSelect.innerHTML="";

  data.forEach(s=>{
    const o=document.createElement("option");
    o.value=s.id;
    o.textContent=s.name;
    stationSelect.append(o);
  });

}


/* ---------------- LINES ---------------- */

async function loadLines(systemId){

  const {data} = await supabaseClient
    .from("lines")
    .select("id,title")
    .eq("system_id",systemId)
    .order("sort_order");

  lineSelect.innerHTML="";

  data.forEach(l=>{
    const o=document.createElement("option");
    o.value=l.id;
    o.textContent=l.title;
    lineSelect.append(o);
  });

}


/* ---------------- SOUNDS ---------------- */

async function loadSounds(systemId){

  const {data} = await supabaseClient
    .from("sounds")
    .select("id,title")
    .eq("system_id",systemId)
    .order("title");

  soundSelect.innerHTML="";

  data.forEach(s=>{
    const o=document.createElement("option");
    o.value=s.id;
    o.textContent=s.title;
    soundSelect.append(o);
  });

}


/* ---------------- SCOPE LOGIC ---------------- */

scopeSelect.addEventListener("change",()=>{

  const scope=scopeSelect.value;

  lineGroup.classList.add("hidden");
  stationGroup.classList.add("hidden");

  if(scope==="line"){
    lineGroup.classList.remove("hidden");
  }

  if(scope==="station"){
    stationGroup.classList.remove("hidden");
  }

});


/* ---------------- COUNTRY CHANGE ---------------- */

countrySelect.addEventListener("change",async()=>{

  const countryId=countrySelect.value;

  await loadSystems(countryId);

  systemSelect.dispatchEvent(new Event("change"));

});


/* ---------------- SYSTEM CHANGE ---------------- */

systemSelect.addEventListener("change",async()=>{

  const systemId=systemSelect.value;

  await loadStations(systemId);
  await loadLines(systemId);
  await loadSounds(systemId);

});


/* ---------------- SUBMIT ---------------- */

document.getElementById("submit-form")
.addEventListener("submit",async(e)=>{

  e.preventDefault();

  const file=document.getElementById("audio").files[0];

  const submissionId=crypto.randomUUID();

  const filePath=`${submissionId}/${file.name}`;


  /* upload audio */

  const {error:uploadError}=await supabaseClient.storage
    .from("pending_audio")
    .upload(filePath,file);

  if(uploadError){
    console.error(uploadError);
    alert("Upload failed");
    return;
  }


  /* determine line_ids */

  let lineIds=[];

  if(scopeSelect.value==="line"){
    lineIds=[lineSelect.value];
  }


  /* determine station */

  let stationId=null;

  if(scopeSelect.value==="station"){
    stationId=stationSelect.value;
  }


  /* insert submission */

  const {error:dbError}=await supabaseClient
    .from("pending_submissions")
    .insert({

      id:submissionId,
      system_id:systemSelect.value,
      station_id:stationId,
      sound_id:soundSelect.value,

      title:document.getElementById("title").value,
      description:document.getElementById("description").value,
      rolling_stock:document.getElementById("rolling_stock").value,

      year_captured:
        document.getElementById("year_captured").value || null,

      source:document.getElementById("source").value,

      line_ids:lineIds,

      audio_storage_path:filePath

    });

  if(dbError){
    console.error(dbError);
    alert("Submission failed");
    return;
  }

  alert("Submission sent!");

});


/* ---------------- INIT ---------------- */

loadCountries();
