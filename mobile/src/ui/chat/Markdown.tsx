import { router, type Href } from 'expo-router';
import { View } from 'react-native';
import { T } from '@/ui/kit';

// Renders the small subset of Markdown the assistant is told to use: **bold**, [links](/in-app), "- " lists and paragraphs.

/** In-app links close the chat, then open the screen (the web's <Link> inside the drawer). */
function go(path: string) {
  if (router.canGoBack()) router.back();
  router.push(path as Href);
}

function inline(text: string, key: string) {
  return text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\))/g).map((part, i) => {
    const k = `${key}-${i}`;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) return <T key={k} w="bold" size={14.5}>{part.slice(2, -2)}</T>;
    const link = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    // Only links inside the app: the model never sends you somewhere else.
    if (link) {
      const href = link[2];
      return href.startsWith('/') && !href.startsWith('//') ? (
        <T key={k} c="mint" size={14.5} w="medium" style={{ textDecorationLine: 'underline' }} onPress={() => go(href)} accessibilityRole="link">
          {`${link[1]} →`}
        </T>
      ) : (
        <T key={k} size={14.5}>{link[1]}</T>
      );
    }
    return part;
  });
}

export function Markdown({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length)
      blocks.push(
        <View key={`ul${blocks.length}`} style={{ gap: 2, paddingLeft: 4 }}>
          {list.map((l, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 8 }}>
              <T size={14.5} c="fg-2">•</T>
              <T size={14.5} style={{ flex: 1 }}>{inline(l, `li${i}`)}</T>
            </View>
          ))}
        </View>,
      );
    list = [];
  };
  text.split('\n').forEach((line, i) => {
    const t = line.trim();
    if (/^[-*•]\s+/.test(t)) list.push(t.replace(/^[-*•]\s+/, ''));
    else {
      flush();
      if (t) blocks.push(<T key={`p${i}`} size={14.5}>{inline(t.replace(/^#+\s*/, ''), `p${i}`)}</T>);
    }
  });
  flush();
  return <View style={{ gap: 10 }}>{blocks}</View>;
}
