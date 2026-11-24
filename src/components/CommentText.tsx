import React from 'react';

/** 把 @昵称 高亮；昵称里可能有空格，按 @ 到下一个空白/标点切。 */
export function CommentText({ text }: { text: string }) {
  const parts = text.split(/(@[^\s@,，。！？!?：:；;]+)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('@') && p.length > 1 ? (
          <span className="comment-mention" key={i}>
            {p}
          </span>
        ) : (
          <React.Fragment key={i}>{p}</React.Fragment>
        ),
      )}
    </>
  );
}
