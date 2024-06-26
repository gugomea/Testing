import { match_string } from "./pkg/automata.js";
import { current_index } from "./visualization/index.js"

function addOnclick() {
    const edit = Array.from(document.getElementsByClassName('op')).slice(1);
    edit[0].addEventListener('click', (e) => edit_text(e, edit[1]));
    edit[1].addEventListener('click', (e) => match(e, edit[0]));

    const fileDiv = document.getElementById('file');
    fileDiv.addEventListener('click', function() {
        const inputFile = document.createElement('input');
        inputFile.type = 'file';
        inputFile.accept = 'text/*';

        inputFile.click();

        inputFile.addEventListener('change', function(event) {
            const selectedFile = event.target.files[0];

            const fileReader = new FileReader();
            fileReader.addEventListener('load', (event) => {
                const fileContent = event.target.result
                edit[0].click();
                const textarea = Array.from(document.getElementsByClassName('content'))[0];
                console.log(textarea.value);
                textarea.value = fileContent;
            });
            fileReader.readAsText(selectedFile);
        });
    });

    const content = document.getElementsByClassName('content')[0];
    content.text = content.innerHTML.replaceAll(/<\/?mark>/g, () => '').replaceAll(/<br>/g, () => '\n');
}

function match(e, o) {
    if(e.target.className.includes('selected')) return;
    console.log(e.target.className);
    o.className = "op";
    e.target.className += " selected";

    const content_div = Array.from(document.getElementsByClassName('content'))[0];
    const textarea_div = document.createElement('div');
    textarea_div.className = content_div.className;

    let input = content_div.value;
    console.log('input:', input);
    let raw_string = [...input];
    console.log('index ==> ', current_index);
    console.log('length:', raw_string.length);
    let idx =  Math.min(current_index, raw_string.length - 1);
    let marked_string = "";
    let matches = match_string(input);
    ///.......match.......
    let last_index = 0;
    const appendMark = (content, id="") => {
        let m = document.createElement('mark');
        m.id = id;
        console.log('mark. content =>', content);
        m.textContent = content;
        m.innerHTML = m.innerHTML.replaceAll(/ /g, '&nbsp;');
        textarea_div.appendChild(m);
    };
    const appendText = (content) => {
        console.log('content =>', content);
        let node = document.createElement('span');
        node.textContent = content;
        node.innerHTML = node.innerHTML.replaceAll(/ /g, '&nbsp;');
        textarea_div.appendChild(node);
    }
    console.log('raw_string:', raw_string);
    for(let match of matches) {
        let [first, last] = [match[0].get('idx'), match[match.length - 1].get('idx')];
        if(idx >= first && idx <= last) {
            appendText(raw_string.slice(last_index, first).join(''));
            appendMark(raw_string.slice(first, idx).join(''));
            appendMark(raw_string[idx], "current");
            appendMark(raw_string.slice(idx + 1, last + 1).join(''));
            marked_string += 
                raw_string.slice(last_index, first).join('')
                + '<mark>' + raw_string.slice(first, idx).join('') + '</mark>' 
                + '<mark id="current">' + raw_string[idx] + '</mark>' 
                + '<mark>' + raw_string.slice(idx + 1, last + 1).join('') + '</mark>';
        } else if(idx < first && idx >= last_index) {
            appendText(raw_string.slice(last_index, idx).join(''));
            appendMark(raw_string[idx], "current");
            appendText(raw_string.slice(idx + 1, first).join(''));
            appendMark(raw_string.slice(first, last + 1).join(''));
            marked_string += 
                raw_string.slice(last_index, idx).join('')
                + '<mark id="current">' + raw_string[idx] + '</mark>' 
                + raw_string.slice(idx + 1, first).join('')
                + '<mark>' + raw_string.slice(first, last + 1).join('') + '</mark>';
        } else {
            appendText(raw_string.slice(last_index, first).join(''));
            appendMark(raw_string.slice(first, last + 1).join(''));
            marked_string += raw_string.slice(last_index, first).join('') + '<mark>' + raw_string.slice(first, last + 1).join('') + '</mark>';
        }
        last_index = last + 1;
    }
    if(idx >= last_index && last_index < raw_string.length) {
        appendText(raw_string.slice(last_index, idx).join(''));
        appendMark(raw_string[idx], "current");
        appendText(raw_string.slice(idx + 1, raw_string.length).join(''));
        marked_string += raw_string.slice(last_index, idx).join('')
            + '<mark id="current">' + raw_string[idx] + '</mark>' 
            + raw_string.slice(idx + 1, raw_string.length).join('');
    } else  {
        appendText(raw_string.slice(last_index, raw_string.length).join(''));
        marked_string += raw_string.slice(last_index, raw_string.length).join('');
    }

    textarea_div.innerHTML = textarea_div.innerHTML.replaceAll(/\n/g, '\n<br>');
    console.log('textarea:', textarea_div.innerHTML);
    textarea_div.text = raw_string.join('');
    content_div.parentNode.replaceChild(textarea_div, content_div);
}

function edit_text(e, o) {
    if(e.target.className.includes('selected')) return;
    o.className = "op";
    e.target.className += " selected";

    const content_div = Array.from(document.getElementsByClassName('content'))[0];
    const textarea_div = document.createElement('textarea');
    textarea_div.spellcheck = false;
    textarea_div.className = content_div.className;

    // const text = content_div.innerHTML.replaceAll(/<\/?mark(\ id="current")?>/g, () => '').replaceAll(/<br>/g, () => '\n');
    const text = content_div.textContent.replaceAll(/&nbsp;/g, ' ');
    console.log('text content:', text);
    console.log('innerhtml', content_div.innerHTML);
    textarea_div.text = text;
    textarea_div.textContent = text
    content_div.parentNode.replaceChild(textarea_div, content_div);
}

window.addEventListener('load', addOnclick);
