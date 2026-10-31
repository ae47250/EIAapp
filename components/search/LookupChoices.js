import { useState } from 'react';
export default function LookupChoices({ choices = [], onChoose, disabled, freeText = false, onFreeText }) {
  const [text,setText]=useState('');
  if (!choices.length && !freeText) return null;
  return (
    <div>
      <div className="variable-actions" aria-label="Available choices">
        {choices.map((action,index) => (
          <button className="ghost-button" type="button" disabled={disabled}
            key={`${action.lookupRowKey || action.choice?.value}-${index}`} onClick={() => onChoose(action)}>
            {action.label}
          </button>
        ))}
      </div>
      {freeText && onFreeText ? <form className="search-form" onSubmit={event => {
        event.preventDefault(); if (text.trim()) { onFreeText(text.trim()); setText(''); }
      }}>
        <label htmlFor="lookup-free-text">Or describe what you mean</label>
        <input id="lookup-free-text" value={text} onChange={event=>setText(event.target.value)} disabled={disabled} />
        <button className="ghost-button" type="submit" disabled={disabled || !text.trim()}>Use this text</button>
      </form> : null}
    </div>
  );
}
