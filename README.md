# zedit-blacksmith
Modify weapons, armour, and crafting recipes and save the changes as patches called "transforms" - plain JSON files.

## Transforms
A transform consists of a reference to a record (the "base") and a set of changes to make to it (the "delta").

Applying a transform will save the outputted records into a new plugin, including all dependent records, so that the new plugin can be used on its own, without requiring the origin plugins as masters.

## Plan
The goal is to allow users to make a transform file that makes changes - likely balance changes - to many different mods, then distribute this transform so others can use it.  Users of the transform can have any subset of the mods affected by the transform.

Version 0.1.0 supports creating and applying transforms.  Eventually there will be a GUI for creating transforms more easily, and doing batch processes, like creating templates and applying them to weapons and armor to quickly produce large transforms that others could then use.

For example, there could be Iron / Steel / Dwemer / etc. tier sword templates consisting of weapon stats and a crafting recipe.  A GUI would let you create those templates and apply them to weapon mods, outputting a transform that could be shared and applied to instantly make those changes.

## Version 0.1.0 usage
Currently all interaction is done through two context menu entries in the tree view - this will change in the future to be less intrusive.

### Blacksmith -> Create transforms from modified elements
This will create a transform file based on your currently modified elements, i.e. unsaved changes.

For example, if you edited the Damage value of the record CoolSword in MyMod.esp from 12 to 13, the saved transform will reference MyMod.esp/CoolSword as the base record, and 13 damage as the delta.

### Blacksmith -> Load transforms
This will apply the selected transform file and record the output in a new plugin file.  It will also copy any references into the new plugin, so that the new plugin can be used without the source plugin.

For example, if you load the transform from before, the new plugin will contain CoolSword with 13 damage.  Let's say MyMod.esp/CoolSword references a 1st Person Model Object in MyMod.esp/CoolSword1st; in that case, CoolSword1st will also be copied into the new plugin.

### Sample data
A simple example transform is here: [https://pastebin.com/3ABZ81mA](https://pastebin.com/3ABZ81mA)

The mods it is based on are:
- [https://www.nexusmods.com/skyrimspecialedition/mods/25513](https://www.nexusmods.com/skyrimspecialedition/mods/25513)
 - [https://www.nexusmods.com/skyrimspecialedition/mods/26573](https://www.nexusmods.com/skyrimspecialedition/mods/26573)
