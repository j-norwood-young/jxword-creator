
export function handleFileSelect(evt) {
    console.log(evt);
    const file = evt.target.file; 
    console.log(file);
    // Only process csv files.
    if (!file.type.match('text/csv')) {
        continue;
    }
    const reader = new FileReader();
    reader.onload = (function(theFile) {
        return function(e) {
            const outputEl = document.getElementById('output_files');
            outputEl.classList.add("row");
            outputEl.classList.add("mt-3");
            const el = document.createElement('div');
            el.classList.add('output_file');
            el.classList.add("col-12");
            el.classList.add("mt-3");
            const csv_txt = e.target.result;
            try {
                // const result = convertCSV(csv_txt);
                // Add card to el
                const card = document.createElement('div');
                card.classList.add('card');
                const card_body = document.createElement('div');
                card_body.classList.add('card-body');
                const card_title = document.createElement('h5');
                card_title.classList.add('card-title');
                card_title.innerHTML = theFile.name;
                
                // Create button
                const btn = document.createElement('button');
                btn.classList.add('btn');
                btn.classList.add('btn-primary');
                btn.innerHTML = 'Download';
                btn.addEventListener('click', function() {
                    const fname = theFile.name.replace(".csv", "-fixed.csv");
                    download(csv_txt, fname, 'text/csv', btn);
                });
                card_body.appendChild(card_title);
                card_body.appendChild(btn);
                card.appendChild(card_body);
                el.appendChild(card);
            } catch (err) {
                el.innerHTML = `<div class='alert alert-danger'>
                <h4>${theFile.name}</h4>
                <strong>Error:</strong> ${err.message}</div>`;
            }
            outputEl.appendChild(el);
        };
    })(f);
    // Read in the image file as a data URL.
    reader.readAsText(f);
}