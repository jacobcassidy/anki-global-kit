/* Standalone answer code syntax highlighting. */

export const syntaxLanguageAliases = [
  [/\bpython\b|\bpy\b/i, 'python'],
  [/\bjavascript\b|\bjs\b|\bnode(?:\.js)?\b/i, 'javascript'],
  [/\btypescript\b|\bts\b/i, 'typescript'],
  [/c\+\+|\bcpp\b/i, 'cpp'],
  [/(?:^|\s)c#(?:\s|$)|\bcsharp\b/i, 'csharp'],
  [/\bjava\b/i, 'java'],
  [/\bsql\b/i, 'sql'],
  [/\bbash\b|\bshell\b|\bsh\b/i, 'bash'],
  [/\bjson\b/i, 'json'],
  [/\bruby\b|\brb\b/i, 'ruby'],
  [/\bgolang\b|\bgo\b/i, 'go'],
  [/\brust\b|\brs\b/i, 'rust'],
  [/\bphp\b/i, 'php'],
  [/^\s*c\s*$/i, 'c'],
];

export const syntaxLanguageRules = {
  python: {
    comments: '#[^\\n]*',
    keywords:
      'and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case',
    builtins:
      'abs all any bin bool breakpoint bytearray bytes callable chr classmethod compile complex delattr dict dir divmod enumerate eval filter float format frozenset getattr hasattr hash help hex id input int isinstance issubclass iter len list locals map max memoryview min next object oct open ord pow print property range repr reversed round set setattr slice sorted staticmethod str sum super tuple type vars zip',
  },
  javascript: {
    comments: '//[^\\n]*|/\\*[\\s\\S]*?\\*/',
    keywords:
      'as async await break case catch class const continue debugger default delete do else export extends finally for from function get if import in instanceof let new of return set static super switch this throw try typeof var void while with yield true false null undefined',
    builtins:
      'Array BigInt Boolean Date Error Function JSON Map Math Number Object Promise Proxy Reflect RegExp Set String Symbol WeakMap WeakSet console document globalThis window',
  },
  typescript: {
    comments: '//[^\\n]*|/\\*[\\s\\S]*?\\*/',
    keywords:
      'abstract any as asserts async await boolean break case catch class const constructor continue declare default delete do else enum export extends finally for from function get if implements import in infer instanceof interface is keyof let module namespace never new null number object of package private protected public readonly require return set static string super switch symbol this throw try type typeof undefined unique unknown var void while with yield',
    builtins: 'Array Boolean Date Error Function Map Math Number Object Promise Record RegExp Set String Symbol WeakMap WeakSet console document window',
  },
  java: {
    comments: '//[^\\n]*|/\\*[\\s\\S]*?\\*/',
    keywords:
      'abstract assert boolean break byte case catch char class const continue default do double else enum exports extends final finally float for if implements import instanceof int interface long module native new opens package permits private protected provides public record requires return short static strictfp super switch synchronized this throw throws to transient try uses void volatile while var yield true false null',
    builtins: 'System String Integer Boolean Character Double Float Long Math Object Runnable Runtime Scanner',
  },
  c: {
    comments: '//[^\\n]*|/\\*[\\s\\S]*?\\*/',
    keywords:
      'auto break case char const continue default do double else enum extern float for goto if inline int long register restrict return short signed sizeof static struct switch typedef union unsigned void volatile while _Bool _Complex _Imaginary',
    builtins: 'FILE size_t NULL printf fprintf sprintf scanf malloc calloc realloc free strlen strcmp strcpy',
  },
  cpp: {
    comments: '//[^\\n]*|/\\*[\\s\\S]*?\\*/',
    keywords:
      'alignas alignof asm auto bool break case catch char class const constexpr continue default delete do double else enum explicit export extern false float for friend goto if inline int long namespace new noexcept nullptr operator private protected public register return short signed sizeof static struct switch template this throw true try typedef typename union unsigned using virtual void volatile while',
    builtins: 'std cout cin cerr endl string vector map unordered_map set unique_ptr shared_ptr size_t',
  },
  csharp: {
    comments: '//[^\\n]*|/\\*[\\s\\S]*?\\*/',
    keywords:
      'abstract as async await bool break byte case catch char checked class const continue decimal default delegate do double else enum event explicit extern false finally fixed float for foreach goto if implicit in int interface internal is lock long namespace new null object operator out override params private protected public readonly ref return sbyte sealed short sizeof stackalloc static string struct switch this throw true try typeof uint ulong unchecked unsafe ushort using virtual void volatile while var',
    builtins: 'Console Convert DateTime Dictionary List Math String Task',
  },
  sql: {
    comments: '--[^\\n]*|/\\*[\\s\\S]*?\\*/',
    keywords:
      'add all alter as asc between by case cast check column constraint create cross current_date current_time database default delete desc distinct drop else end exists foreign from full group having in index inner insert into is join key left like limit not null offset on or order outer primary references right row select set table then transaction union unique update use using values view when where with',
    builtins: 'avg count max min sum coalesce concat lower round upper',
  },
  bash: {
    comments: '#[^\\n]*',
    keywords: 'case do done elif else esac fi for function if in select then until while time coproc',
    builtins: 'cd echo eval exec exit export printf pwd read set shift source test unset',
  },
  json: { comments: '(?!)', keywords: 'true false null', builtins: '' },
  ruby: {
    comments: '#[^\\n]*',
    keywords:
      'alias and begin break case class def defined do else elsif end ensure false for if in module next nil not or redo rescue retry return self super then true undef unless until when while yield',
    builtins: 'Array Hash Integer Kernel Math Module Object Range String Symbol',
  },
  go: {
    comments: '//[^\\n]*|/\\*[\\s\\S]*?\\*/',
    keywords:
      'break case chan const continue default defer else fallthrough for func go goto if import interface map package range return select struct switch type var bool byte complex64 complex128 error float32 float64 int int8 int16 int32 int64 rune string uint uint8 uint16 uint32 uint64 uintptr true false iota nil',
    builtins: 'append cap close complex copy delete imag len make new panic print println real recover',
  },
  rust: {
    comments: '//[^\\n]*|/\\*[\\s\\S]*?\\*/',
    keywords:
      'as async await break const continue crate dyn else enum extern false fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait true type union unsafe use where while bool char str i8 i16 i32 i64 i128 isize u8 u16 u32 u64 u128 usize f32 f64',
    builtins: 'Some None Ok Err Vec String Box Option Result',
  },
  php: {
    comments: '//[^\\n]*|#[^\\n]*|/\\*[\\s\\S]*?\\*/',
    keywords:
      'abstract and array as break callable case catch class clone const continue declare default do else elseif empty endfor endforeach endif endswitch endwhile eval exit extends final finally fn for foreach function global goto if implements include include_once instanceof insteadof interface isset list namespace new or print private protected public require require_once return static switch throw trait try unset use var while xor yield true false null',
    builtins: 'count echo isset strlen array_map in_array print_r var_dump',
  },
};
