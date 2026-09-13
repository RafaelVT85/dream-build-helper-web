# Pasta de ícones

Essa pasta já vem com a sua coleção de ícones (490 arquivos), do jeito que você organizou:

```
icons/
  Viajantes/           -> Hero_<Nome>.avif (avatar de cada personagem)
  Memorias/
    Character/          -> skills exclusivas de personagem
    Identy/              -> skills de identidade (passiva fixa)
    Comun/ Raro/ Epico/ Lendario/ Unico/  -> skills gerais, por raridade
  Essencias/
    Comun/ Raro/ Epico/ Lendario/ Unico/  -> essências, por raridade
  Estrelas/
    Vida/ Imaginacao/ Flexivel/ destruicao/  -> estrelas de Constelação
```

O app não usa mais a antiga pasta plana `memorias/`/`essencias/` — os arquivos
`src/data/games/shape-of-dreams.json` agora têm um campo `icon` em cada
Traveler/skill/essência, apontando pro caminho exato dentro dessa pasta
(ex.: `"icon": "Memorias/Character/St_Q_IncendiaryRounds.avif"`). Se o campo
não existir (ainda não casei o ícone com o item), o app cai pro selo colorido
de sempre.

## Cobertura atual
- **Personagens:** 8/8 ✅
- **Skills usadas nas builds:** 37/46 (faltam algumas que talvez você não tenha
  separado ainda: Arrow Storm, Battle Cry, El's Sanctuary, Ice Shield, Pure Soul,
  Serpent's Blessing, Swift Strike, Arrow Barrage)
- **Essencias usadas nas builds:** 121/129 (faltam: Freezing/Congelamento,
  The Giant/Gigante, The Vortex/Redemoinho, Virtue/Virtude — já achei o
  arquivo real dessas no site, só não estavam nos 490 que você separou)
- **Estrelas de Constelação:** ainda sem ícone — os nomes de arquivo delas
  (`Se_Star_<Personagem>_<Categoria>_<CodigoInterno>.avif`) não têm relação
  clara com o nome em português que uso nos dados, não consegui casar
  automaticamente. Se quiser, me manda o nome real de cada estrela (tipo
  hover no jogo) que eu tento de novo.

Se você adicionar mais arquivos aqui depois, me avisa o que faltou que eu
recaso automaticamente — não precisa renomear nada manualmente.
